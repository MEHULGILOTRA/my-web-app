#!/bin/bash

echo "=========================================="
echo "  Sky Miles Travels - Node v22 Fix"
echo "=========================================="
echo ""

# Clean everything
echo "🧹 Cleaning dependencies..."
rm -rf node_modules package-lock.json package-lock-nested.json

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "Trying with --force..."
    npm install --force
fi

echo ""
echo "🔧 Applying Node v22 compatibility fixes..."

# Create craco config for webpack 5 fix
cat > craco.config.js << 'EOF'
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable fork-ts-checker-webpack-plugin
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );
      return webpackConfig;
    }
  }
};
EOF

echo "✓ Configuration applied"
echo ""
echo "🚀 Starting development server..."
echo "   Opens at http://localhost:3000"
echo ""

# Set environment variables and start
export NODE_OPTIONS="--openssl-legacy-provider"
export GENERATE_SOURCEMAP=false
export DISABLE_ESLINT_PLUGIN=true

npm start
