#!/bin/bash

# Ensure required environment variables are set
required_vars=("GCP_PROJECT_ID" "GCP_BUCKET_APP_NAME" "SSL_CERT_NAME" "GCP_DNS_ZONE_NAME" "DOMAIN_NAME")

# Set up gcloud CLI using Service Account Key
SCRIPT_DIR="$(dirname "$0")"
source "${SCRIPT_DIR}/common.sh"

login_service_account "$GCP_SA_KEY_PATH" "$GCP_PROJECT_ID"
set_project "$GCP_PROJECT_ID"

# created in functions.sh
SANITIZED_GCP_BUCKET_APP_NAME=$(sanitize_bucket_name "$GCP_BUCKET_APP_NAME")

# Create SSL certificate name if not provided
if [ -z "$SSL_CERT_NAME" ]; then
  SSL_CERT_NAME="${SANITIZED_GCP_BUCKET_APP_NAME}-ssl-cert"
fi

progress() {
  local task_name="$1"
  echo -ne "Task: [ $task_name ]\r"
}

echo "Starting GCP setup script for bucket $GCP_BUCKET_APP_NAME renamed to $SANITIZED_GCP_BUCKET_APP_NAME"

# Set Default GCP Project
progress "Setting GCP project to $GCP_PROJECT_ID..."
gcloud config set project "$GCP_PROJECT_ID"

# Reserve global static external IP address for Load Balancer
progress "Reserving global static external IP address for Load Balancer..."
if ! gcloud compute addresses describe "${SANITIZED_GCP_BUCKET_APP_NAME}-ip" --global > /dev/null 2>&1; then
  gcloud compute addresses create "${SANITIZED_GCP_BUCKET_APP_NAME}-ip" \
    --network-tier=PREMIUM \
    --ip-version=IPV4 \
    --global
else
  printf "\e[31mIP address ${SANITIZED_GCP_BUCKET_APP_NAME}-ip already exists. Skipping creation.\e[0m\n"
fi

# Get and display the static IP address
STATIC_IP=$(gcloud compute addresses describe "${SANITIZED_GCP_BUCKET_APP_NAME}-ip" --global --format="value(address)")
printf "\e[32mStatic IP Address: $STATIC_IP\e[0m\n"

# Check if DNS zone exists and set up DNS records
progress "Setting up DNS records..."
if gcloud dns managed-zones describe "$GCP_DNS_ZONE_NAME" > /dev/null 2>&1; then
  # Update DNS A record to point to the static IP
  gcloud dns record-sets transaction start --zone="$GCP_DNS_ZONE_NAME" 2>/dev/null || true
  gcloud dns record-sets transaction remove --zone="$GCP_DNS_ZONE_NAME" --name="$DOMAIN_NAME." --type=A --ttl=300 2>/dev/null || true
  gcloud dns record-sets transaction add --zone="$GCP_DNS_ZONE_NAME" --name="$DOMAIN_NAME." --type=A --ttl=300 "$STATIC_IP"
  gcloud dns record-sets transaction execute --zone="$GCP_DNS_ZONE_NAME" 2>/dev/null || true
  printf "\e[32mDNS A record updated to point to $STATIC_IP\e[0m\n"
else
  printf "\e[33mDNS zone $GCP_DNS_ZONE_NAME not found. Please set up DNS manually:\e[0m\n"
  printf "\e[33mA record: $DOMAIN_NAME -> $STATIC_IP\e[0m\n"
fi

# Wait for DNS propagation
progress "Waiting for DNS propagation..."
sleep 30

# Verify domain is accessible before creating SSL certificate
progress "Verifying domain accessibility..."
if curl -s -I "http://$DOMAIN_NAME" | grep -q "200\|301\|302"; then
  printf "\e[32mDomain $DOMAIN_NAME is accessible\e[0m\n"
else
  printf "\e[33mWarning: Domain $DOMAIN_NAME may not be accessible yet. SSL certificate creation may fail.\e[0m\n"
  printf "\e[33mCurrent DNS points to: $(nslookup $DOMAIN_NAME | grep 'Address:' | tail -1 | awk '{print $2}')\e[0m\n"
  printf "\e[33mExpected IP: $STATIC_IP\e[0m\n"
fi

# Create SSL Certificate for Load Balancer
progress "Creating SSL certificate..."
if ! gcloud compute ssl-certificates describe "$SSL_CERT_NAME" --global > /dev/null 2>&1; then
  gcloud compute ssl-certificates create "$SSL_CERT_NAME" \
    --description="SSL Certificate for Load Balancer" \
    --domains="$DOMAIN_NAME" \
    --global
  printf "\e[32mSSL certificate $SSL_CERT_NAME created\e[0m\n"
else
  printf "\e[31mSSL certificate $SSL_CERT_NAME already exists. Skipping creation.\e[0m\n"
fi

# Create GCS Bucket
progress "Creating GCS bucket..."
if ! gcloud storage buckets describe "gs://${SANITIZED_GCP_BUCKET_APP_NAME}" --format="json(name)" > /dev/null 2>&1; then
  gcloud storage buckets create "gs://${SANITIZED_GCP_BUCKET_APP_NAME}" \
    --project="$GCP_PROJECT_ID" \
    --default-storage-class=standard \
    --location="$GCP_BUCKET_API_ZONE" \
    --uniform-bucket-level-access
else
  printf "\e[31mGCS Bucket ${SANITIZED_GCP_BUCKET_APP_NAME} already exists. Skipping creation.\e[0m\n"
fi

# Make GCS Bucket publicly readable
gcloud storage buckets add-iam-policy-binding "gs://${SANITIZED_GCP_BUCKET_APP_NAME}" \
  --member=allUsers \
  --role=roles/storage.objectViewer

gcloud storage buckets update "gs://${SANITIZED_GCP_BUCKET_APP_NAME}" \
  --web-main-page-suffix=index.html --web-error-page=index.html

# Create external Application Load Balancer with backend buckets
progress "Creating backend bucket..."
if ! gcloud compute backend-buckets describe "${SANITIZED_GCP_BUCKET_APP_NAME}-backend" > /dev/null 2>&1; then
  gcloud compute backend-buckets create "${SANITIZED_GCP_BUCKET_APP_NAME}-backend" \
    --gcs-bucket-name="$SANITIZED_GCP_BUCKET_APP_NAME" \
    --enable-cdn
else
  printf "\e[31mBackend bucket ${SANITIZED_GCP_BUCKET_APP_NAME}-backend already exists. Skipping creation.\e[0m\n"
fi

# Configure the URL map HTTPS
progress "Configuring URL map for HTTPS..."
if ! gcloud compute url-maps describe "${SANITIZED_GCP_BUCKET_APP_NAME}-url-map" > /dev/null 2>&1; then
  gcloud compute url-maps create "${SANITIZED_GCP_BUCKET_APP_NAME}-url-map" \
    --default-backend-bucket="${SANITIZED_GCP_BUCKET_APP_NAME}-backend"
else
  printf "\e[31mURL map ${SANITIZED_GCP_BUCKET_APP_NAME}-url-map already exists. Skipping creation.\e[0m\n"
fi

# Configure the target HTTPS proxy
progress "Configuring target HTTPS proxy..."
if ! gcloud compute target-https-proxies describe "${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy" > /dev/null 2>&1; then
  gcloud compute target-https-proxies create "${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy" \
    --url-map="${SANITIZED_GCP_BUCKET_APP_NAME}-url-map" \
    --ssl-certificates="$SSL_CERT_NAME" \
    --global
else
  printf "\e[31mHTTPS proxy ${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy already exists. Skipping creation.\e[0m\n"
fi

# gcloud compute url-maps add-path-matcher "${SANITIZED_GCP_BUCKET_APP_NAME}-url-map" \
#    --default-backend-bucket="${SANITIZED_GCP_BUCKET_APP_NAME}-backend" \
#    --path-matcher-name="all-paths" \
#    --path-rules="/*=${SANITIZED_GCP_BUCKET_APP_NAME}"

# Configure the forwarding rule HTTPS
progress "Configuring forwarding rule for HTTPS..."
if ! gcloud compute forwarding-rules describe "${SANITIZED_GCP_BUCKET_APP_NAME}-https-rule" --global > /dev/null 2>&1; then
  gcloud compute forwarding-rules create "${SANITIZED_GCP_BUCKET_APP_NAME}-https-rule" \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --network-tier=PREMIUM \
    --address="${SANITIZED_GCP_BUCKET_APP_NAME}-ip" \
    --global \
    --target-https-proxy="${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy" \
    --ports=443
else
  printf "\e[31mHTTPS forwarding rule ${SANITIZED_GCP_BUCKET_APP_NAME}-https-rule already exists. Skipping creation.\e[0m\n"
fi

# HTTP to HTTPS redirection
progress "Configuring URL map for HTTP to HTTPS redirection..."
if ! gcloud compute url-maps describe http-to-https --global > /dev/null 2>&1; then
  gcloud compute url-maps import http-to-https \
    --source "$SCRIPT_DIR/http-to-https.yaml" \
    --global
else
  printf "\e[31mURL map http-to-https already exists. Skipping creation.\e[0m\n"
fi

# Configure the target HTTP proxy
progress "Configuring target HTTP proxy..."
if ! gcloud compute target-http-proxies describe "${SANITIZED_GCP_BUCKET_APP_NAME}-http-proxy" --global > /dev/null 2>&1; then
  gcloud compute target-http-proxies create "${SANITIZED_GCP_BUCKET_APP_NAME}-http-proxy" \
    --url-map=http-to-https \
    --global
else
  printf "\e[31mHTTP proxy ${SANITIZED_GCP_BUCKET_APP_NAME}-http-proxy already exists. Skipping creation.\e[0m\n"
fi

# Configure the forwarding rule HTTP
progress "Configuring forwarding rule for HTTP..."
if ! gcloud compute forwarding-rules describe "${SANITIZED_GCP_BUCKET_APP_NAME}-http-rule" --global > /dev/null 2>&1; then
  gcloud compute forwarding-rules create "${SANITIZED_GCP_BUCKET_APP_NAME}-http-rule" \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --network-tier=PREMIUM \
    --address="${SANITIZED_GCP_BUCKET_APP_NAME}-ip" \
    --global \
    --target-http-proxy="${SANITIZED_GCP_BUCKET_APP_NAME}-http-proxy" \
    --ports=80
else
  printf "\e[31mHTTP forwarding rule ${SANITIZED_GCP_BUCKET_APP_NAME}-http-rule already exists. Skipping creation.\e[0m\n"
fi

# Final verification
printf "\n\e[32m=== Setup Complete ===\e[0m\n"
printf "\e[32mStatic IP: $STATIC_IP\e[0m\n"
printf "\e[32mDomain: $DOMAIN_NAME\e[0m\n"
printf "\e[32mSSL Certificate: $SSL_CERT_NAME\e[0m\n"
printf "\e[32mBucket: gs://$SANITIZED_GCP_BUCKET_APP_NAME\e[0m\n"

# Check SSL certificate status
progress "Checking SSL certificate status..."
CERT_STATUS=$(gcloud compute ssl-certificates describe "$SSL_CERT_NAME" --global --format="value(managed.status)" 2>/dev/null || echo "UNKNOWN")
if [ "$CERT_STATUS" = "ACTIVE" ]; then
  printf "\e[32mSSL certificate is ACTIVE - Site should be accessible at https://$DOMAIN_NAME\e[0m\n"
elif [ "$CERT_STATUS" = "PROVISIONING" ]; then
  printf "\e[33mSSL certificate is PROVISIONING - This may take 5-30 minutes\e[0m\n"
  printf "\e[33mCheck status with: gcloud compute ssl-certificates describe $SSL_CERT_NAME --global\e[0m\n"
else
  printf "\e[31mSSL certificate status: $CERT_STATUS\e[0m\n"
fi

printf "\nGCP setup script completed.\n"
