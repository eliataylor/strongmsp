#!/bin/bash
# Script to add missing permissions to the existing service account

# Set the service account email from the key file
SERVICE_ACCOUNT_EMAIL="strongmsp-api@strongmsp.iam.gserviceaccount.com"
PROJECT_ID="strongmsp"

echo "This script needs to be run with an account that has Owner or IAM Admin permissions."
echo "Please authenticate with your owner account first:"
echo ""

# Check if user is authenticated
CURRENT_USER=$(gcloud config get-value account 2>/dev/null)
if [ -z "$CURRENT_USER" ]; then
    echo "No authenticated user found. Please run: gcloud auth login"
    exit 1
fi

echo "Currently authenticated as: $CURRENT_USER"
echo "Adding iam.serviceAccountTokenCreator role to $SERVICE_ACCOUNT_EMAIL..."

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/iam.serviceAccountTokenCreator" \
    --quiet

if [ $? -eq 0 ]; then
    echo "✅ Successfully added iam.serviceAccountTokenCreator role to $SERVICE_ACCOUNT_EMAIL"
else
    echo "❌ Failed to add iam.serviceAccountTokenCreator role to $SERVICE_ACCOUNT_EMAIL"
    echo "Make sure you're authenticated with an account that has Owner or IAM Admin permissions."
    exit 1
fi

echo "Service account permissions updated successfully!"
