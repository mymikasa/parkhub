-- MySQL initialization script for ParkHub development environment
-- This script runs on first container startup

-- Grant privileges to parkhub user (already created by MYSQL_USER env)
GRANT ALL PRIVILEGES ON parkhub_dev.* TO 'parkhub'@'%';
FLUSH PRIVILEGES;
