#!/bin/bash
set -e

echo "🚀 Starting full deployment of Clare Vogue..."

# Build backend image
echo "🔨 Building backend Docker image..."
docker build -f apps/backend/Dockerfile -t ghcr.io/jpunique/clare-vogue-backend:latest \
  -t ghcr.io/jpunique/clare-vogue-backend:secure-auth .

# Build frontend image
echo "🔨 Building frontend Docker image..."
docker build -f apps/frontend/Dockerfile -t ghcr.io/jpunique/clare-vogue-frontend:latest \
  -t ghcr.io/jpunique/clare-vogue-frontend:secure-auth .

echo "✅ Docker images built successfully!"
echo ""
echo "🔄 Loading images into K3s..."
k3s ctr images import <(docker save ghcr.io/jpunique/clare-vogue-backend:latest) 2>/dev/null || true
k3s ctr images import <(docker save ghcr.io/jpunique/clare-vogue-frontend:latest) 2>/dev/null || true

echo "🔄 Restarting deployments..."
kubectl rollout restart deployment/clare-vogue-backend -n default
kubectl rollout restart deployment/clare-vogue-frontend -n default

echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/clare-vogue-backend -n default --timeout=5m
kubectl rollout status deployment/clare-vogue-frontend -n default --timeout=5m

echo ""
echo "✅ Deployment complete!"
echo ""
kubectl get pods -n default | grep clare-vogue
echo ""
echo "🌐 Application is ready at http://100.78.231.65:30001"
