#!/bin/bash

echo "=========================================="
echo "  Complete Git Commit & Push"
echo "=========================================="
echo ""

# Fix any git locks first
LOCK_FILE=".git/index.lock"
if [ -f "$LOCK_FILE" ]; then
    echo "🔓 Removing stale git lock..."
    rm -f "$LOCK_FILE"
    rm -f ".git/HEAD.lock" 2>/dev/null
    echo "✅ Lock removed"
    echo ""
fi

# Check if on correct branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "develop" ] && [ "$CURRENT_BRANCH" != "overall_changes" ]; then
    echo "⚠️  You're on branch: $CURRENT_BRANCH"
    echo "   Do you want to continue? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""

# Stage all changes
echo "📝 Staging all changes..."
git add .

if [ $? -ne 0 ]; then
    echo "❌ Failed to stage files. Check errors above."
    exit 1
fi

echo ""
echo "📊 Changes to be committed:"
git status --short

echo ""
echo "💬 Enter commit message (or press Enter for default):"
read -r commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="Fix project structure, optimize performance, and clean dependencies"
fi

echo ""
echo "📦 Committing with message:"
echo "   \"$commit_msg\""
git commit -m "$commit_msg"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Commit successful!"
    echo ""
    echo "🚀 Push to remote? (y/n)"
    read -r push_response
    
    if [ "$push_response" = "y" ]; then
        echo "Pushing to origin/$CURRENT_BRANCH..."
        git push origin $CURRENT_BRANCH
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Successfully pushed to GitHub!"
            echo "   View at: https://github.com/MEHULGILOTRA/my-web-app"
        else
            echo ""
            echo "❌ Push failed. You may need to pull first:"
            echo "   git pull origin $CURRENT_BRANCH --rebase"
            echo "   Then run this script again"
        fi
    else
        echo ""
        echo "⏸️  Not pushed. To push later, run:"
        echo "   git push origin $CURRENT_BRANCH"
    fi
else
    echo ""
    echo "❌ Commit failed. Check the errors above."
fi

echo ""
echo "=========================================="
