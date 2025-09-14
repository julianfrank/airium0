#!/bin/bash

echo "Testing Core Module Deployment..."

# Check if AWS CLI is configured
echo "Checking AWS configuration..."
aws sts get-caller-identity

if [ $? -ne 0 ]; then
    echo "AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "AWS configuration OK"

# Try to deploy basic Amplify backend
echo "Attempting Amplify deployment..."
npx ampx sandbox --once

echo "Deployment test completed."