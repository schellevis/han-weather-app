#!/bin/bash
# Build het Docker image zonder cache.
# Gebruik: ./build.sh [image-naam] [tag]
# Standaard: han-weather-app:latest

set -e

IMAGE_NAME="${1:-${IMAGE_NAME:-han-weather-app}}"
IMAGE_TAG="${2:-${IMAGE_TAG:-latest}}"

echo "🔨 Docker image bouwen: ${IMAGE_NAME}:${IMAGE_TAG} (no-cache)..."
docker build --no-cache -t "${IMAGE_NAME}:${IMAGE_TAG}" .
echo "✅ Build klaar: ${IMAGE_NAME}:${IMAGE_TAG}"
