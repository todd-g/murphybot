#!/bin/bash
#
# Install git hooks for the second brain repo
#

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPTS_DIR="$REPO_ROOT/scripts"

echo "Installing git hooks..."

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-commit hook
cp "$SCRIPTS_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"

echo "Installed pre-commit hook"
echo ""
echo "Make sure you have the Python dependencies installed:"
echo "  pip install -r scripts/requirements.txt"
echo ""
echo "And set your Convex URL in app/.env:"
echo "  NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud"
echo ""
echo "Done!"


