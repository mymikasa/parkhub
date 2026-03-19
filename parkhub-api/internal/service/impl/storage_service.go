package impl

import (
	"context"
	"fmt"
	"io"

	"github.com/google/wire"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/parkhub/api/internal/service"
)

var StorageServiceSet = wire.NewSet(NewStorageService, wire.Bind(new(service.StorageService), new(*MinIOStorageService)))

type MinIOStorageConfig struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

type MinIOStorageService struct {
	client *minio.Client
	bucket string
	config MinIOStorageConfig
}

func NewStorageService(cfg MinIOStorageConfig) (*MinIOStorageService, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create minio client: %w", err)
	}

	return &MinIOStorageService{
		client: client,
		bucket: cfg.Bucket,
		config: cfg,
	}, nil
}

func (s *MinIOStorageService) Upload(ctx context.Context, objectName string, reader io.Reader, size int64, contentType string) (string, error) {
	_, err := s.client.PutObject(ctx, s.bucket, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload object: %w", err)
	}

	return s.buildURL(objectName), nil
}

func (s *MinIOStorageService) GetURL(_ context.Context, objectName string) (string, error) {
	return s.buildURL(objectName), nil
}

func (s *MinIOStorageService) Delete(ctx context.Context, objectName string) error {
	err := s.client.RemoveObject(ctx, s.bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}
	return nil
}

func (s *MinIOStorageService) buildURL(objectName string) string {
	scheme := "http"
	if s.config.UseSSL {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s/%s/%s", scheme, s.config.Endpoint, s.bucket, objectName)
}
