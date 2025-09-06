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

echo "Starting GCP cleanup script for bucket $GCP_BUCKET_APP_NAME renamed to $SANITIZED_GCP_BUCKET_APP_NAME"

# Set Default GCP Project
progress "Setting GCP project to $GCP_PROJECT_ID..."
gcloud config set project "$GCP_PROJECT_ID"

# Delete HTTP forwarding rule
progress "Deleting HTTP forwarding rule..."
if gcloud compute forwarding-rules describe "${SANITIZED_GCP_BUCKET_APP_NAME}-http-rule" --global > /dev/null 2>&1; then
  gcloud compute forwarding-rules delete "${SANITIZED_GCP_BUCKET_APP_NAME}-http-rule" --global --quiet
  printf "\e[32mHTTP forwarding rule ${SANITIZED_GCP_BUCKET_APP_NAME}-http-rule deleted.\e[0m\n"
else
  printf "\e[33mHTTP forwarding rule ${SANITIZED_GCP_BUCKET_APP_NAME}-http-rule not found. Skipping.\e[0m\n"
fi

# Delete target HTTP proxy
progress "Deleting target HTTP proxy..."
if gcloud compute target-http-proxies describe "${SANITIZED_GCP_BUCKET_APP_NAME}-http-proxy" --global > /dev/null 2>&1; then
  gcloud compute target-http-proxies delete "${SANITIZED_GCP_BUCKET_APP_NAME}-http-proxy" --global --quiet
  printf "\e[32mTarget HTTP proxy ${SANITIZED_GCP_BUCKET_APP_NAME}-http-proxy deleted.\e[0m\n"
else
  printf "\e[33mTarget HTTP proxy ${SANITIZED_GCP_BUCKET_APP_NAME}-http-proxy not found. Skipping.\e[0m\n"
fi

# Delete HTTPS forwarding rule
progress "Deleting HTTPS forwarding rule..."
if gcloud compute forwarding-rules describe "${SANITIZED_GCP_BUCKET_APP_NAME}-https-rule" --global > /dev/null 2>&1; then
  gcloud compute forwarding-rules delete "${SANITIZED_GCP_BUCKET_APP_NAME}-https-rule" --global --quiet
  printf "\e[32mHTTPS forwarding rule ${SANITIZED_GCP_BUCKET_APP_NAME}-https-rule deleted.\e[0m\n"
else
  printf "\e[33mHTTPS forwarding rule ${SANITIZED_GCP_BUCKET_APP_NAME}-https-rule not found. Skipping.\e[0m\n"
fi

# Delete target HTTPS proxy
progress "Deleting target HTTPS proxy..."
if gcloud compute target-https-proxies describe "${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy" --global > /dev/null 2>&1; then
  gcloud compute target-https-proxies delete "${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy" --global --quiet
  printf "\e[32mTarget HTTPS proxy ${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy deleted.\e[0m\n"
else
  printf "\e[33mTarget HTTPS proxy ${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy not found. Skipping.\e[0m\n"
fi

# Delete URL map
progress "Deleting URL map..."
if gcloud compute url-maps describe "${SANITIZED_GCP_BUCKET_APP_NAME}-url-map" > /dev/null 2>&1; then
  gcloud compute url-maps delete "${SANITIZED_GCP_BUCKET_APP_NAME}-url-map" --quiet
  printf "\e[32mURL map ${SANITIZED_GCP_BUCKET_APP_NAME}-url-map deleted.\e[0m\n"
else
  printf "\e[33mURL map ${SANITIZED_GCP_BUCKET_APP_NAME}-url-map not found. Skipping.\e[0m\n"
fi

# Delete backend bucket
progress "Deleting backend bucket..."
if gcloud compute backend-buckets describe "${SANITIZED_GCP_BUCKET_APP_NAME}-backend" > /dev/null 2>&1; then
  gcloud compute backend-buckets delete "${SANITIZED_GCP_BUCKET_APP_NAME}-backend" --quiet
  printf "\e[32mBackend bucket ${SANITIZED_GCP_BUCKET_APP_NAME}-backend deleted.\e[0m\n"
else
  printf "\e[33mBackend bucket ${SANITIZED_GCP_BUCKET_APP_NAME}-backend not found. Skipping.\e[0m\n"
fi

# Delete GCS bucket (this will also remove all objects in the bucket)
progress "Deleting GCS bucket..."
if gcloud storage buckets describe "gs://${SANITIZED_GCP_BUCKET_APP_NAME}" --format="json(name)" > /dev/null 2>&1; then
  gcloud storage buckets delete "gs://${SANITIZED_GCP_BUCKET_APP_NAME}" --quiet
  printf "\e[32mGCS bucket ${SANITIZED_GCP_BUCKET_APP_NAME} deleted.\e[0m\n"
else
  printf "\e[33mGCS bucket ${SANITIZED_GCP_BUCKET_APP_NAME} not found. Skipping.\e[0m\n"
fi

# Delete SSL certificate
progress "Deleting SSL certificate..."
if gcloud compute ssl-certificates describe "$SSL_CERT_NAME" --global > /dev/null 2>&1; then
  gcloud compute ssl-certificates delete "$SSL_CERT_NAME" --global --quiet
  printf "\e[32mSSL certificate $SSL_CERT_NAME deleted.\e[0m\n"
else
  printf "\e[33mSSL certificate $SSL_CERT_NAME not found. Skipping.\e[0m\n"
fi

# Delete global static IP address
progress "Deleting global static IP address..."
if gcloud compute addresses describe "${SANITIZED_GCP_BUCKET_APP_NAME}-ip" --global > /dev/null 2>&1; then
  gcloud compute addresses delete "${SANITIZED_GCP_BUCKET_APP_NAME}-ip" --global --quiet
  printf "\e[32mGlobal static IP address ${SANITIZED_GCP_BUCKET_APP_NAME}-ip deleted.\e[0m\n"
else
  printf "\e[33mGlobal static IP address ${SANITIZED_GCP_BUCKET_APP_NAME}-ip not found. Skipping.\e[0m\n"
fi

# Note: We don't delete the http-to-https URL map as it might be shared by other resources
# If you need to delete it, uncomment the following lines:
# progress "Deleting HTTP to HTTPS URL map..."
# if gcloud compute url-maps describe http-to-https --global > /dev/null 2>&1; then
#   gcloud compute url-maps delete http-to-https --global --quiet
#   printf "\e[32mHTTP to HTTPS URL map deleted.\e[0m\n"
# else
#   printf "\e[33mHTTP to HTTPS URL map not found. Skipping.\e[0m\n"
# fi

printf "\nGCP cleanup script completed.\n"
