package health

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"gorm.io/gorm"
)

const pingTimeout = 3 * time.Second

// Handler implements http.Handler for GET /healthz.
// It concurrently Pings all domain databases and returns a JSON summary.
// Response codes: 200 = healthy, 503 = degraded.
//
// Note: this handler MUST be registered on the raw http.ServeMux (not
// wrapped by any OTel HTTP middleware) to avoid generating trace noise
// from K8s liveness/readiness probes.
type Handler struct {
	dbs map[string]*gorm.DB
}

// NewHandler creates a Handler with the given named database map.
func NewHandler(dbs map[string]*gorm.DB) *Handler {
	return &Handler{dbs: dbs}
}

type response struct {
	Status    string            `json:"status"`
	Databases map[string]string `json:"databases"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), pingTimeout)
	defer cancel()

	type pingResult struct {
		name string
		err  error
	}

	ch := make(chan pingResult, len(h.dbs))
	var wg sync.WaitGroup

	for name, db := range h.dbs {
		wg.Add(1)
		go func(name string, db *gorm.DB) {
			defer wg.Done()
			sqlDB, err := db.DB()
			if err != nil {
				ch <- pingResult{name: name, err: err}
				return
			}
			ch <- pingResult{name: name, err: sqlDB.PingContext(ctx)}
		}(name, db)
	}

	// Close channel when all goroutines finish.
	go func() {
		wg.Wait()
		close(ch)
	}()

	dbStatus := make(map[string]string, len(h.dbs))
	degraded := false
	for res := range ch {
		if res.err != nil {
			dbStatus[res.name] = "error: " + res.err.Error()
			degraded = true
		} else {
			dbStatus[res.name] = "ok"
		}
	}

	resp := response{
		Status:    "ok",
		Databases: dbStatus,
	}
	statusCode := http.StatusOK
	if degraded {
		resp.Status = "degraded"
		statusCode = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(resp)
}
