# Clare Vogue Deployment Guide

## Architecture

- **CI/CD**: GitHub Actions (PRs) + Self-hosted runner on dms-server
- **Cluster**: K3s on dms-server
- **Container Registry**: GitHub Container Registry (GHCR)
- **Database**: PostgreSQL (dms-server shared infra)
- **Storage**: MinIO (dms-server shared infra)
- **Frontend**: Next.js (port 3001)
- **Backend**: NestJS (port 3000)

## Prerequisites

✅ SSH access to `dms-server` (user: `administrator`)  
✅ kubectl configured on dms-server  
✅ GitHub CLI authenticated  
✅ Docker available on dms-server (builds happen on runner)  

## Setup

### 1. Environment Configuration

Create `.env` in project root with secrets:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key

# Database (use dms-server shared PostgreSQL)
DATABASE_URL=postgresql://user:password@192.168.1.50:55432/clare_vogue

# Optional: Storage (use dms-server shared MinIO)
MINIO_ENDPOINT=192.168.1.50:59000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=clare-vogue
```

**IMPORTANT**: Never commit `.env` to git. Keep a backup:

```bash
mkdir -p ~/secret-backups
cp .env ~/secret-backups/.env-$(date +%Y%m%d-%H%M%S)
```

### 2. GitHub Actions Setup

#### Create PAT for GHCR

1. Go to https://github.com/settings/tokens/new
2. Select scopes: `repo`, `write:packages`, `read:packages`
3. Save token

#### Register Secrets in Repository

```bash
gh secret set GHCR_PULL_USER --body "your-github-username"
gh secret set GHCR_PULL_TOKEN --body "your-pat-token"
```

### 3. Setup Self-Hosted Runner on dms-server

```bash
# SSH to dms-server
ssh dms-server

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/JpEbuka/clare-vogue/main/scripts/setup-runner.sh | bash

# Go to runner directory
cd ~/actions-runner-clare-vogue

# Get registration token from:
# https://github.com/JpEbuka/clare-vogue/settings/actions/runners/new

# Configure runner
./config.sh --url https://github.com/JpEbuka/clare-vogue --token YOUR_TOKEN

# Install and start
svc.sh install administrator
svc.sh start

# Check status
svc.sh status
```

### 4. Create Kubernetes Namespace and Secrets

```bash
# SSH to dms-server
ssh dms-server 'export KUBECONFIG=/home/administrator/.kube/config && \
  kubectl create namespace clare-vogue --dry-run=client -o yaml | kubectl apply -f -'

# Copy your .env to dms-server
scp .env dms-server:~/clare-vogue.env

# Create secret on dms-server
ssh dms-server 'export KUBECONFIG=/home/administrator/.kube/config && \
  kubectl create secret generic clare-vogue-env \
    --from-env-file=~/clare-vogue.env \
    --dry-run=client -o yaml | \
    kubectl apply -f - -n clare-vogue'
```

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start backend and frontend
make dev

# Frontend: http://localhost:3001
# Backend: http://localhost:3000
# API Docs: http://localhost:3000/api/docs
```

### Build and Push Images

```bash
# Build Docker images
make docker-build VERSION=v1.0.0

# Push to GHCR
make docker-push VERSION=v1.0.0
```

### Deploy to Kubernetes

```bash
# Deploy to dms-server
make k8s-deploy VERSION=v1.0.0

# Check status
make k8s-status

# View logs
make k8s-logs
```

### CI/CD Pipeline

1. **Push to `main` branch** → Triggers CD workflow
2. **CD Workflow**:
   - Checks disk space
   - Installs dependencies
   - Builds Docker images
   - Pushes to GHCR
   - Applies Kubernetes manifests
   - Verifies deployment health
   - Automatic rollback on failure

### Monitoring Deployment

```bash
# Check pod status
kubectl get pods -n clare-vogue

# View startup probe logs
kubectl logs -n clare-vogue -l app=clare-vogue-backend --tail=50

# Describe pod for events
kubectl describe pod -n clare-vogue -l app=clare-vogue-backend

# Check health endpoints
kubectl exec -n clare-vogue -l app=clare-vogue-backend -- \
  curl http://localhost:3000/api/v1/health/startup
```

## Health Checks

Backend includes comprehensive dependency checks:

- **`/api/v1/health`** - Basic health (always 200 if running)
- **`/api/v1/health/ready`** - Readiness (checks dependencies)
- **`/api/v1/health/startup`** - Startup verification (strict dependency checks)

Checks verify:
- ✅ Database connectivity
- ✅ Supabase configuration
- ✅ Environment variables
- ✅ Connection latency

Example:

```bash
curl http://localhost:3000/api/v1/health/startup

{
  "ready": true,
  "timestamp": "2026-11-09T08:00:00.000Z",
  "dependencies": {
    "database": {
      "ready": true,
      "latency": 2
    },
    "supabase": {
      "ready": true
    },
    "config": {
      "ready": true
    }
  }
}
```

## Troubleshooting

### Pod fails to start

```bash
# Check events
kubectl describe pod -n clare-vogue <pod-name>

# View logs
kubectl logs -n clare-vogue <pod-name> --previous

# Check startup probe
kubectl logs -n clare-vogue <pod-name> | grep -i "startup\|health"
```

### Database connection fails

```bash
# Verify DATABASE_URL
kubectl get secret clare-vogue-env -n clare-vogue -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Test connection from pod
kubectl exec -n clare-vogue <pod-name> -- \
  psql "$DATABASE_URL" -c "SELECT 1"
```

### Rollback deployment

```bash
# Automatic rollback
kubectl rollout undo deployment/clare-vogue-backend -n clare-vogue
kubectl rollout undo deployment/clare-vogue-frontend -n clare-vogue

# View history
kubectl rollout history deployment/clare-vogue-backend -n clare-vogue
```

## Accessing Services

### From dms-server

```bash
# Backend
curl http://clare-vogue-backend:3000/api/v1/health

# Frontend
curl http://clare-vogue-frontend:3001
```

### From Tailscale (via dms-server)

- **Frontend**: https://dms-server.tail2aa0ce.ts.net/
- **Backend API**: https://dms-server.tail2aa0ce.ts.net/api/v1/
- **Docs**: https://dms-server.tail2aa0ce.ts.net/api/docs

## Maintenance

### Check disk space on runner

```bash
ssh dms-server 'df -h /mnt'
```

### Clean up old images

```bash
ssh dms-server 'docker system prune --force'
```

### View runner logs

```bash
ssh dms-server 'tail -f ~/actions-runner-clare-vogue/_diag/*.log'
```

## Database Migrations

Migrations are NOT automatically applied during deployment.

To apply migrations:

```bash
# From local machine
npm run db:migrate --workspace @clare-vogue/backend \
  DATABASE_URL=postgresql://user:password@dms-server:55432/clare_vogue
```

## Backup and Recovery

### Backup database

```bash
ssh dms-server 'pg_dump -h 192.168.1.50 -U clare_vogue -d clare_vogue > ~/backups/clare_vogue-$(date +%Y%m%d).sql'
```

### Backup secrets

```bash
mkdir -p ~/secret-backups
cp .env ~/secret-backups/.env-$(date +%Y%m%d-%H%M%S)
```

## Support

- **Issues**: https://github.com/JpEbuka/clare-vogue/issues
- **DMS Server Ops**: Refer to `~/.claude/jpebuka/dms-server-ops.md`
