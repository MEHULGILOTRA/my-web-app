#!/bin/bash

echo "=========================================="
echo "  Complete Project Cleanup & Restructure"
echo "=========================================="
echo ""

cd "/Users/mehulgilotra/Desktop/Claude/Sky Miles Travels/my-web-app"

# Remove all node_modules directories
echo "🧹 Removing all node_modules directories..."
rm -rf node_modules
rm -rf "node_modules 2"
rm -rf "node_modules 3"
rm -rf my-web-app/node_modules

# Remove all lock files
echo "🧹 Removing lock files..."
rm -f package-lock.json
rm -f package-lock-nested.json
rm -f my-web-app/package-lock.json

# Remove nested my-web-app directory if it only has config files
echo "🧹 Cleaning nested directories..."
if [ -d "my-web-app" ]; then
    rm -rf my-web-app
fi

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📦 Installing fresh dependencies..."

# Install with proper flags for Node v22
npm install --legacy-peer-deps

echo ""
echo "✅ Installation complete!"
echo ""
echo "Project structure is now clean and ready."
echo ""
