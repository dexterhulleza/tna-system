#!/bin/bash
# =============================================================================
# TNA System — VPS Update Script
# Run this on the VPS after pushing changes to GitHub.
# Usage: ./update.sh
# =============================================================================
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "🔄 [1/5] Pulling latest changes from GitHub..."
git pull origin main

echo "📦 [2/5] Installing dependencies..."
pnpm install --frozen-lockfile

echo "🗄️  [3/5] Applying database migrations..."
pnpm db:push

echo "🔨 [4/5] Building for production..."
pnpm build

echo "🚀 [5/5] Reloading PM2 process..."
pm2 reload tna-system

echo ""
echo "✅ TNA System updated successfully!"
echo "   Run 'pm2 logs tna-system' to check for errors."
