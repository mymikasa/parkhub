package impl

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/parkhub/api/internal/service"
)

// OverstayScanner 超时停放扫描器
type OverstayScanner struct {
	transitRecordService service.TransitRecordService
	stopCh               chan struct{}
	wg                   sync.WaitGroup
}

// NewOverstayScanner 创建超时停放扫描器
func NewOverstayScanner(transitRecordService service.TransitRecordService) *OverstayScanner {
	return &OverstayScanner{
		transitRecordService: transitRecordService,
		stopCh:               make(chan struct{}),
	}
}

// Start 启动扫描器
func (s *OverstayScanner) Start() {
	s.wg.Add(1)
	go s.scanLoop()
	slog.Info("overstay scanner started", "interval", "1h")
}

// Stop 停止扫描器
func (s *OverstayScanner) Stop() {
	close(s.stopCh)
	s.wg.Wait()
	slog.Info("overstay scanner stopped")
}

func (s *OverstayScanner) scanLoop() {
	defer s.wg.Done()

	// 启动时立即执行一次
	s.scan()

	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.scan()
		case <-s.stopCh:
			return
		}
	}
}

func (s *OverstayScanner) scan() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := s.transitRecordService.ScanOverstay(ctx); err != nil {
		slog.Error("overstay scan failed", "error", err)
	} else {
		slog.Debug("overstay scan completed")
	}
}
