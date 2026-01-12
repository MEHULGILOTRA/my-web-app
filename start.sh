#!/bin/bash

echo "=========================================="
echo "  Sky Miles Travels - Development Server"
echo "=========================================="
echo ""

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -ge 18 ]; then
    echo "⚠️  Detected Node.js v$NODE_VERSION"
    echo "   Setting compatibility flags..."
    export NODE_OPTIONS="--openssl-legacy-provider"
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "🚀 Starting development server..."
echo "   Server will start at: http://localhost:3000"
echo ""
echo "   Press Ctrl+C to stop"
echo "=========================================="
echo ""

GENERATE_SOURCEMAP=false npm start
