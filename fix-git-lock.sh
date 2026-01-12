#!/bin/bash

echo "=========================================="
echo "  Fix Git Lock Issue"
echo "=========================================="
echo ""

# Remove the lock file
LOCK_FILE="/Users/mehulgilotra/Desktop/Claude/Sky Miles Travels/my-web-app/.git/index.lock"

if [ -f "$LOCK_FILE" ]; then
    echo "🔓 Removing git lock file..."
    rm -f "$LOCK_FILE"
    echo "✅ Lock file removed"
else
    echo "✅ No lock file found"
fi

echo ""
echo "🔍 Checking for other git locks..."

# Remove other potential lock files
rm -f "/Users/mehulgilotra/Desktop/Claude/Sky Miles Travels/my-web-app/.git/HEAD.lock" 2>/dev/null
rm -f "/Users/mehulgilotra/Desktop/Claude/Sky Miles Travels/my-web-app/.git/refs/heads/*.lock" 2>/dev/null

echo "✅ All git locks cleared"
echo ""
echo "You can now run git commands:"
echo "  git add ."
echo "  git commit -m \"your message\""
echo ""
