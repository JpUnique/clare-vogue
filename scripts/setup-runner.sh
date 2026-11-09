#!/bin/bash
set -e

# Setup GitHub Actions self-hosted runner for dms-server
# Run this on the dms-server as: bash -s < setup-runner.sh

RUNNER_NAME="clare-vogue"
RUNNER_LABELS="dms-server,k3s,clare-vogue"
RUNNER_URL="https://github.com/JpEbuka/clare-vogue"

echo "🔧 Setting up GitHub Actions runner for $RUNNER_NAME..."

# Check if runner directory exists
if [ -d "$HOME/actions-runner-$RUNNER_NAME" ]; then
  echo "⚠️  Runner directory already exists. Updating..."
  cd "$HOME/actions-runner-$RUNNER_NAME"
  git fetch origin
  git checkout main
else
  echo "📦 Creating runner directory..."
  mkdir -p "$HOME/actions-runner-$RUNNER_NAME"
  cd "$HOME/actions-runner-$RUNNER_NAME"
fi

# Download latest runner
echo "⬇️  Downloading latest runner..."
RUNNER_RELEASE=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep -o '"browser_download_url.*runner-linux-arm64.*\.tar\.gz' | sed 's/"browser_download_url": "//g')

if [ -f "bin/Runner.Listener" ]; then
  echo "✅ Runner already downloaded"
else
  curl -L "$RUNNER_RELEASE" | tar xz
fi

# Create .env file for runner
echo "📝 Creating runner .env file..."
cat > .env << EOF
# GitHub Actions Runner Configuration
RUNNER_ALLOW_RUNASROOT=true
RUNNER_NAME=$RUNNER_NAME
RUNNER_LABELS=$RUNNER_LABELS
KUBECONFIG=/home/administrator/.kube/config

# Clare Vogue Configuration
BACKEND_PUBLIC_URL=http://clare-vogue-backend.dms-server
EOF

# Add GHCR credentials (create these in your GitHub account)
echo ""
echo "⚠️  Add your GHCR credentials to .env:"
echo "GHCR_PULL_USER=<your-github-username>"
echo "GHCR_PULL_TOKEN=<your-github-pat-token>"
echo ""

# Make scripts executable
chmod +x bin/*
chmod +x scripts/*

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your GitHub credentials"
echo "2. Configure the runner:"
echo "   cd $HOME/actions-runner-$RUNNER_NAME"
echo "   ./config.sh --url $RUNNER_URL --token <TOKEN>"
echo "3. Start the runner:"
echo "   svc.sh install administrator"
echo "   svc.sh start"
echo ""
echo "To generate a registration token, visit:"
echo "https://github.com/JpEbuka/clare-vogue/settings/actions/runners/new"
