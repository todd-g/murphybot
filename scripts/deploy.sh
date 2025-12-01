#!/bin/bash
# Deploy to both Convex and Vercel

set -e

echo "🚀 Deploying MurphyBot..."

cd "$(dirname "$0")/.."

# Push to git (triggers Vercel auto-deploy)
echo ""
echo "📤 Pushing to GitHub..."
git push

# Deploy Convex functions
echo ""
echo "⚡ Deploying Convex functions..."
cd app
npx convex deploy --yes

# Force Vercel production deploy (in case auto-deploy is slow)
echo ""
echo "▲ Deploying to Vercel..."
cd ..
npx vercel --prod --yes

echo ""
echo "✅ Deploy complete!"
echo "   - Convex: https://brazen-meerkat-177.convex.cloud"
echo "   - Vercel: https://murphybot.vercel.app"

