#!/bin/bash

# Docker build troubleshooting script

echo "=== Docker Build Troubleshooting ==="

# Check Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running or not accessible"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✅ Docker is running"

# Check available disk space
echo "=== Disk Space ==="
df -h . | head -2

# Check Docker system info
echo "=== Docker System Info ==="
docker system df

# Clean up Docker if needed
echo "=== Docker Cleanup ==="
read -p "Do you want to clean up Docker (remove unused images, containers, networks)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning up Docker..."
    docker system prune -f
    docker builder prune -f
fi

# Try building with verbose output
echo "=== Building Django Container ==="
echo "Building with verbose output..."

cd stack/django

# Try building with different approaches
echo "Attempting build with standard Dockerfile..."
if docker build -t django-test .; then
    echo "✅ Standard build successful"
else
    echo "❌ Standard build failed, trying alternative approach..."
    
    # Try with alternative Dockerfile if it exists
    if [ -f "Dockerfile.alternative" ]; then
        echo "Trying alternative Dockerfile..."
        if docker build -f Dockerfile.alternative -t django-test .; then
            echo "✅ Alternative build successful"
        else
            echo "❌ Alternative build also failed"
        fi
    else
        echo "❌ Alternative Dockerfile not found"
    fi
fi

# Show build cache info
echo "=== Build Cache Info ==="
docker builder du

echo "=== Troubleshooting Complete ==="
