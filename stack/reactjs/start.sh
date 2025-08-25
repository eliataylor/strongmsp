#!/bin/bash

# Ensure .env exists, fallback to .env.public if missing
[ -f .env ] || cp .env.public .env

# Load environment variables from .env
while IFS='=' read -r key value; do
    [[ $key =~ ^[[:space:]]*# ]] && continue  # skip comments
    [[ -z $key ]] && continue                 # skip empty lines
    key=$(echo "$key" | xargs)               # trim whitespace
    value=$(echo "$value" | xargs)           # trim whitespace
    export "$key"="$value"
done < .env

# Extract protocol, host, and port from REACT_APP_APP_HOST
if [[ -n "$REACT_APP_APP_HOST" ]]; then
    PROTOCOL=$(echo "$REACT_APP_APP_HOST" | sed -E 's|^(https?)://.*|\1|')
    HOST=$(echo "$REACT_APP_APP_HOST" | sed -E 's|^https?://([^:/]+).*|\1|')
    PORT=$(echo "$REACT_APP_APP_HOST" | sed -E 's|^https?://[^:/]+:?([0-9]*)/?|\1|')

    # Default to HTTPS if protocol is "https"
    if [[ "$PROTOCOL" == "https" ]]; then
        export HTTPS=true
    fi

    # Set HOST and PORT if extracted values exist
    export HOST="${HOST:-0.0.0.0}"
    export PORT="${PORT:-3008}"
fi

# populates EnvProvider.tsx with necessary prefixes for react-scripts
export REACT_APP_DEFAULT_PERMS=$DEFAULT_PERMS

echo "DEFAULT_PERMS: $DEFAULT_PERMS vs $REACT_APP_DEFAULT_PERMS"

# mkcert -key-file certificate.strongmindstrongperformance.com.key -cert-file certificate.strongmindstrongperformance.com.crt localhost.strongmindstrongperformance.com localhost 127.0.0.1 ::1

# Ensure the app is accessible from Docker
if [[ -n "$DOCKER_ENV" ]]; then
    export HOST="0.0.0.0"
fi

# Start React app
npm run start-on-osx
#npm run start-ssl-in-docker
