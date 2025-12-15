#!/bin/bash

echo "🧹 Cleaning up Kubernetes resources..."

kubectl delete namespace temperature-monitoring --ignore-not-found=true

echo "✅ Cleanup complete!"
