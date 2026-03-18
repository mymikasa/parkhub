package mqtt

import (
	"fmt"
	"log/slog"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

// Config holds MQTT connection parameters.
type Config struct {
	BrokerURL    string
	Username     string
	Password     string
	ClientID     string
	OnConnect    func(pahomqtt.Client) // 连接/重连时回调（用于重新订阅）
}

// New creates an MQTT client, connects to the broker, and returns it.
// The returned cleanup function disconnects gracefully.
func New(cfg Config) (pahomqtt.Client, func(), error) {
	opts := pahomqtt.NewClientOptions().
		AddBroker(cfg.BrokerURL).
		SetClientID(cfg.ClientID).
		SetAutoReconnect(true).
		SetMaxReconnectInterval(30 * time.Second).
		SetKeepAlive(60 * time.Second).
		SetCleanSession(true).
		SetConnectionLostHandler(func(_ pahomqtt.Client, err error) {
			slog.Warn("mqtt connection lost", "error", err)
		}).
		SetOnConnectHandler(func(c pahomqtt.Client) {
			slog.Info("mqtt connected", "broker", cfg.BrokerURL)
			if cfg.OnConnect != nil {
				cfg.OnConnect(c)
			}
		})

	if cfg.Username != "" {
		opts.SetUsername(cfg.Username)
		opts.SetPassword(cfg.Password)
	}

	client := pahomqtt.NewClient(opts)
	token := client.Connect()
	token.Wait()
	if err := token.Error(); err != nil {
		return nil, nil, fmt.Errorf("mqtt connect failed: %w", err)
	}

	cleanup := func() {
		client.Disconnect(1000)
		slog.Info("mqtt disconnected")
	}

	return client, cleanup, nil
}
