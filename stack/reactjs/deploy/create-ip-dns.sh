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

# Fetch and display the static IP address
progress "Fetching static IP address..."
STATIC_IP=$(gcloud compute addresses describe "${SANITIZED_GCP_BUCKET_APP_NAME}-ip" \
  --format="get(address)" \
  --global 2>/dev/null)

printf "\e[31mUsing Static IP: $STATIC_IP\e[0m\n"

# Create DNS zone if it doesn't exist
createDnsZone() {
  progress "Creating DNS zone..."
  if ! gcloud dns managed-zones describe "$GCP_DNS_ZONE_NAME" > /dev/null 2>&1; then
    gcloud dns managed-zones create "$GCP_DNS_ZONE_NAME" \
      --dns-name="$DOMAIN_NAME" \
      --description="DNS zone for $DOMAIN_NAME"
  else
    echo -e "\e[31mDNS zone $GCP_DNS_ZONE_NAME already exists. Skipping creation.\e[0m"
  fi
}

createDnsZone

# Add DNS record set for the domain
gcloud dns record-sets transaction start --zone="$GCP_DNS_ZONE_NAME"
gcloud dns record-sets transaction add --zone="$GCP_DNS_ZONE_NAME" --name="$DOMAIN_NAME" --ttl=300 --type=A "$STATIC_IP"
gcloud dns record-sets transaction execute --zone="$GCP_DNS_ZONE_NAME"

show_loading "Creating DNS record..."
if ! gcloud dns record-sets describe "${DOMAIN_NAME}." --type=A --zone="$GCP_DNS_ZONE_NAME" > /dev/null 2>&1; then
    gcloud dns record-sets create "${DOMAIN_NAME}." \
        --zone="$GCP_DNS_ZONE_NAME" \
        --type="A" \
        --ttl="300" \
        --rrdatas="$STATIC_IP"
    if [ $? -ne 0 ]; then
        print_error "$DOMAIN_NAME DNS record creation" "Failed"
        exit 1
    else
        print_success "$DOMAIN_NAME DNS record" "Created"
    fi
else
    print_warning "$DOMAIN_NAME DNS record already exists" "Skipped"
fi