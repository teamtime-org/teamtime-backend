#!/bin/bash

# TeamTime Backend Deployment Script
# Usage: ./deploy.sh [environment]

set -e

# Configuration
ENVIRONMENT="${1:-production}"
IMAGE_NAME="teamtime-backend"
CONTAINER_NAME="teamtime-backend"
NETWORK_NAME="teamtime-network"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env.${ENVIRONMENT}" ]; then
    log_error ".env.${ENVIRONMENT} file not found!"
    exit 1
fi

log_info "Starting deployment for ${ENVIRONMENT} environment..."

# Load environment variables
export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)

# Create network if it doesn't exist
if ! docker network ls | grep -q ${NETWORK_NAME}; then
    log_info "Creating Docker network ${NETWORK_NAME}..."
    docker network create ${NETWORK_NAME}
fi

# Build Docker image
log_info "Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

# Stop existing container
if docker ps -a | grep -q ${CONTAINER_NAME}; then
    log_warn "Stopping existing container..."
    docker stop ${CONTAINER_NAME} || true
    docker rm ${CONTAINER_NAME} || true
fi

# Run database migrations
log_info "Running database migrations..."
docker run --rm \
    --env-file .env.${ENVIRONMENT} \
    --network ${NETWORK_NAME} \
    ${IMAGE_NAME}:latest \
    npx prisma migrate deploy

# Start new container
log_info "Starting new container..."
docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    --env-file .env.${ENVIRONMENT} \
    --network ${NETWORK_NAME} \
    -p ${PORT:-3000}:3000 \
    -v teamtime-uploads:/app/uploads \
    -v teamtime-logs:/app/logs \
    ${IMAGE_NAME}:latest

# Wait for container to be healthy
log_info "Waiting for container to be healthy..."
RETRIES=30
while [ $RETRIES -gt 0 ]; do
    if docker exec ${CONTAINER_NAME} node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" 2>/dev/null; then
        log_info "Container is healthy!"
        break
    fi
    RETRIES=$((RETRIES-1))
    if [ $RETRIES -eq 0 ]; then
        log_error "Container failed to become healthy"
        docker logs ${CONTAINER_NAME}
        exit 1
    fi
    sleep 2
done

# Clean up old images
log_info "Cleaning up old images..."
docker image prune -f

log_info "Deployment completed successfully!"
log_info "Application is running at http://localhost:${PORT:-3000}"
log_info "API documentation available at http://localhost:${PORT:-3000}/api/docs"