#!/bin/bash
# ============================================================
# Italian Enclaves Map - Server Setup Script
# Server: Hostinger KVM2 - 187.77.12.244
# Domain: italianenclavesmap.org
# ============================================================

set -e  # Exit on any error

# --- Config ---
APP_DIR="/var/www/italianenclaves"
DOMAIN="italianenclavesmap.org"
REPO="https://github.com/anawaz1220/italinaenclaves.git"
BRANCH="vercel-deployment"
DB_NAME="italianenclaves"
DB_USER="italianenclaves"
DB_PASS="EnclavesDB2026#"
BACKEND_PORT=3001
GOOGLE_API_KEY="AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I"
NEON_DB_URL="postgresql://neondb_owner:npg_A3UscPLtE8Yl@ep-summer-moon-aioehezs-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo "============================================================"
echo " Italian Enclaves - Server Setup"
echo "============================================================"

# ---- Step 1: System Update ----
echo ""
echo "[1/9] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git unzip ufw postgresql postgresql-contrib

# ---- Step 2: Node.js 20 LTS ----
echo ""
echo "[2/9] Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

# Install PM2
npm install -g pm2 -q

# ---- Step 3: Nginx ----
echo ""
echo "[3/9] Installing Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx

# ---- Step 4: PostgreSQL Setup ----
echo ""
echo "[4/9] Setting up PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Create DB user and database
sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = '${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# ---- Step 5: Clone Repository ----
echo ""
echo "[5/9] Cloning repository..."
mkdir -p ${APP_DIR}
if [ -d "${APP_DIR}/.git" ]; then
  cd ${APP_DIR} && git pull origin ${BRANCH}
else
  git clone -b ${BRANCH} ${REPO} ${APP_DIR}
fi

# ---- Step 6: Database Migration from Neon ----
echo ""
echo "[6/9] Migrating database from Neon to local PostgreSQL..."
# Install pg_dump client if needed
apt-get install -y -qq postgresql-client

# Dump from Neon and import to local
echo "  Dumping from Neon (this may take a moment)..."
PGPASSWORD="" pg_dump "${NEON_DB_URL}" \
  --no-owner \
  --no-acl \
  --schema=public \
  -f /tmp/neon_dump.sql 2>&1 || true

if [ -f /tmp/neon_dump.sql ] && [ -s /tmp/neon_dump.sql ]; then
  echo "  Importing to local PostgreSQL..."
  sudo -u postgres psql -d ${DB_NAME} -f /tmp/neon_dump.sql > /dev/null 2>&1 || true
  sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};"
  sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};"
  CHURCH_COUNT=$(sudo -u postgres psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM churches;" 2>/dev/null | tr -d ' ' || echo "0")
  echo "  Imported ${CHURCH_COUNT} church records."
  rm -f /tmp/neon_dump.sql
else
  echo "  WARNING: Neon dump failed or empty. Will use schema-only migration."
  sudo -u postgres psql -d ${DB_NAME} <<'EOSQL'
CREATE TABLE IF NOT EXISTS public.churches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  year_founded INTEGER,
  notes TEXT,
  original_location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  formatted_address TEXT,
  google_place_id VARCHAR(255),
  google_photos JSONB,
  google_rating DECIMAL(3,1),
  enrichment_status VARCHAR(20) DEFAULT 'pending',
  enrichment_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
EOSQL
  sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};"
  sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};"
fi

# ---- Step 7: Backend Setup ----
echo ""
echo "[7/9] Setting up backend..."
cd ${APP_DIR}/backend

# Create .env
cat > .env <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
GOOGLE_API_KEY=${GOOGLE_API_KEY}
NODE_ENV=production
PORT=${BACKEND_PORT}
EOF

npm install --silent
npm run build

# Start with PM2
pm2 delete italianenclaves-backend 2>/dev/null || true
pm2 start dist/index.js --name italianenclaves-backend
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "  Backend running on port ${BACKEND_PORT}"

# ---- Step 8: Frontend Build ----
echo ""
echo "[8/9] Building frontend..."
cd ${APP_DIR}/frontend

cat > .env.production <<EOF
VITE_API_URL=https://${DOMAIN}
VITE_GOOGLE_MAPS_API_KEY=${GOOGLE_API_KEY}
EOF

npm install --silent
npm run build

# Copy built files to web root
mkdir -p /var/www/html/italianenclaves
cp -r dist/* /var/www/html/italianenclaves/
echo "  Frontend built and deployed."

# ---- Step 9: Nginx Configuration ----
echo ""
echo "[9/9] Configuring Nginx..."
cp ${APP_DIR}/deploy/nginx-italianenclaves.conf /etc/nginx/sites-available/italianenclaves
ln -sf /etc/nginx/sites-available/italianenclaves /etc/nginx/sites-enabled/italianenclaves
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

echo ""
echo "============================================================"
echo " Setup Complete!"
echo "============================================================"
echo " App running at: http://${DOMAIN} (HTTP only until SSL setup)"
echo " Backend health: http://187.77.12.244/api/churches?limit=1"
echo ""
echo " NEXT STEP - Set up SSL (run after DNS is pointed to this server):"
echo "   bash ${APP_DIR}/deploy/setup-ssl.sh"
echo "============================================================"
