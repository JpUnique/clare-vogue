.PHONY: help docker-build docker-push k8s-deploy k8s-rollback k8s-status k8s-logs clean

VERSION ?= latest
REGISTRY ?= ghcr.io/jpunique
NAMESPACE ?= clare-vogue
BACKEND_IMAGE ?= $(REGISTRY)/clare-vogue-backend:$(VERSION)
FRONTEND_IMAGE ?= $(REGISTRY)/clare-vogue-frontend:$(VERSION)

help:
	@echo "Clare Vogue Deployment Commands"
	@echo ""
	@echo "Local Development:"
	@echo "  make dev              - Start frontend and backend in development mode"
	@echo "  make build            - Build all workspaces"
	@echo "  make test             - Run all tests"
	@echo "  make lint             - Run linters"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build     - Build Docker images (VERSION=tag)"
	@echo "  make docker-push      - Push images to registry"
	@echo ""
	@echo "Kubernetes Deployment:"
	@echo "  make k8s-deploy       - Deploy to Kubernetes (VERSION=tag)"
	@echo "  make k8s-rollback     - Rollback last deployment"
	@echo "  make k8s-status       - Show deployment status"
	@echo "  make k8s-logs         - Show deployment logs"
	@echo "  make k8s-describe     - Show detailed resource info"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean            - Remove build artifacts"

# Development
dev:
	@npm run dev:backend &
	@npm run dev:frontend &
	@echo "Frontend: http://localhost:3001"
	@echo "Backend: http://localhost:3000"
	@echo "API Docs: http://localhost:3000/api/docs"

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

# Docker
docker-build:
	@echo "Building Docker images with tag $(VERSION)..."
	docker build -f apps/frontend/Dockerfile \
		--tag $(FRONTEND_IMAGE) \
		--cache-from type=registry,ref=$(FRONTEND_IMAGE) \
		.
	docker build -f apps/backend/Dockerfile \
		--tag $(BACKEND_IMAGE) \
		--cache-from type=registry,ref=$(BACKEND_IMAGE) \
		.
	@echo "✅ Docker images built:"
	@echo "  Frontend: $(FRONTEND_IMAGE)"
	@echo "  Backend: $(BACKEND_IMAGE)"

docker-push: docker-build
	@echo "Pushing Docker images to registry..."
	docker push $(FRONTEND_IMAGE)
	docker push $(BACKEND_IMAGE)
	@echo "✅ Images pushed successfully"

# Kubernetes
k8s-deploy:
	@echo "Deploying to Kubernetes namespace $(NAMESPACE)..."
	kubectl create namespace $(NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -
	@echo "Creating secrets from .env..."
	kubectl create secret generic clare-vogue-env \
		--from-env-file=.env \
		--dry-run=client -o yaml | kubectl apply -f - -n $(NAMESPACE)
	@echo "Applying Kubernetes manifests..."
	kubectl apply -f k8s/ -n $(NAMESPACE)
	kubectl set image deployment/clare-vogue-backend \
		backend=$(BACKEND_IMAGE) \
		-n $(NAMESPACE)
	kubectl set image deployment/clare-vogue-frontend \
		frontend=$(FRONTEND_IMAGE) \
		-n $(NAMESPACE)
	@echo "✅ Deployment complete"
	@make k8s-status

k8s-rollback:
	@echo "Rolling back deployments..."
	kubectl rollout undo deployment/clare-vogue-backend -n $(NAMESPACE)
	kubectl rollout undo deployment/clare-vogue-frontend -n $(NAMESPACE)
	@echo "✅ Rollback complete"
	@make k8s-status

k8s-status:
	@echo "=== Deployment Status ==="
	kubectl get deployments -n $(NAMESPACE)
	@echo ""
	@echo "=== Pods ==="
	kubectl get pods -n $(NAMESPACE)
	@echo ""
	@echo "=== Services ==="
	kubectl get services -n $(NAMESPACE)

k8s-logs:
	@echo "Backend logs:"
	kubectl logs -n $(NAMESPACE) -l app=clare-vogue-backend --tail=50 -f
	@echo ""
	@echo "Frontend logs:"
	kubectl logs -n $(NAMESPACE) -l app=clare-vogue-frontend --tail=50 -f

k8s-describe:
	@echo "=== Deployments ==="
	kubectl describe deployment -n $(NAMESPACE)
	@echo ""
	@echo "=== Pods ==="
	kubectl describe pods -n $(NAMESPACE)
	@echo ""
	@echo "=== Services ==="
	kubectl describe services -n $(NAMESPACE)

k8s-shell-backend:
	@kubectl exec -it -n $(NAMESPACE) $$(kubectl get pod -n $(NAMESPACE) -l app=clare-vogue-backend -o jsonpath='{.items[0].metadata.name}') -- /bin/sh

k8s-shell-frontend:
	@kubectl exec -it -n $(NAMESPACE) $$(kubectl get pod -n $(NAMESPACE) -l app=clare-vogue-frontend -o jsonpath='{.items[0].metadata.name}') -- /bin/sh

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	rm -rf apps/*/dist apps/*/.next node_modules
	@echo "✅ Clean complete"
