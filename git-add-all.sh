#!/bin/bash

echo "=========================================="
echo "  Git - Add All Files & Commit"
echo "=========================================="
echo ""

# Show current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Add all files
echo "📝 Adding files to git..."
git add .gitignore
git add .env
git add .npmrc
git add package.json
git add README.md
git add public/
git add src/
git add cleanup.sh
git add fix-and-start.sh
git add start.sh
git add start.bat

echo ""
echo "✅ Files staged for commit"
echo ""
echo "📊 Git status:"
git status --short

echo ""
echo "Ready to commit! Run:"
echo "  git commit -m \"Fix project structure and optimize performance\""
echo ""
