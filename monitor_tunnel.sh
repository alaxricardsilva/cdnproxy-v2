#!/bin/bash

# Define service name
SERVICE="cloudflared"

# Check if service is active
if systemctl is-active --quiet $SERVICE; then
    echo "$(date): $SERVICE is running."
else
    echo "$(date): $SERVICE is DOWN. Restarting..."
    systemctl restart $SERVICE
    if systemctl is-active --quiet $SERVICE; then
        echo "$(date): $SERVICE successfully restarted."
    else
        echo "$(date): Failed to restart $SERVICE."
    fi
fi
