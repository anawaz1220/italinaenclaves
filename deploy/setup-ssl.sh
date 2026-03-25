#!/bin/bash
# ============================================================
# Italian Enclaves - SSL Setup (run AFTER DNS is pointed)
# Requires: Domain DNS A record pointing to 187.77.12.244
# ============================================================

set -e

DOMAIN="italianenclavesmap.org"

echo "Setting up SSL for ${DOMAIN}..."

# Install Certbot
apt-get install -y -qq certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx \
  -d ${DOMAIN} \
  -d www.${DOMAIN} \
  --non-interactive \
  --agree-tos \
  --email admin@italianenclavesmap.org \
  --redirect

# Auto-renewal is set up by certbot automatically
# Test renewal
certbot renew --dry-run

echo ""
echo "SSL setup complete!"
echo "Site is now live at: https://${DOMAIN}"
echo "Auto-renewal: configured (runs twice daily via systemd/cron)"
