# Italian Enclaves Map Application

## Project Overview
Interactive USA-wide map application for Italian Churches and Italian Enclave Areas, similar to Red Sauce Map (https://map.forkingtasty.com/).

## Current Phase: Order 3 (Website Links) - COMPLETED
- Enclave and church popups now show "Visit Page" linking to italianenclaves.org
- 458/786 enclaves linked, 274/305 churches linked
- Unmatched records sent to client in Excel for correction
- Map embedded on italianenclaves.org homepage (Divi, Code module iframe)
- Dedicated /map/ page also exists on italianenclaves.org (kept, removed from nav)

## Order 1 (Churches Only) - COMPLETED
- 316 church records imported from Excel
- 305 churches successfully enriched with Google Places data
- 11 churches failed enrichment (see scripts/failed_enrichments.json)

## Order 2 (Enclaves + Admin Panel) - COMPLETED
- 787 enclaves imported, 786 enriched, 1 failed
- Admin panel at /admin (password: ChurchEnclave@2026)
- Layer toggle, photo carousel, search, clustering all live

### Order 2 Deliverables
- ✅ Enclaves layer with triangle markers and radius overlays
- ✅ Admin panel: Dashboard, Upload Data, Churches/Enclaves records tables
- ✅ Sortable columns, pagination (top+bottom), per-page selector
- ✅ Responsive admin header with hamburger menu
- ✅ Sample CSV download in Upload section
- ✅ Layer toggle (top-left), map style button (bottom-left stack)

## Tech Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with PostGIS (local installation)
- **Maps**: Google Maps JavaScript API
- **APIs**: Google Places API (New), Google Places Photos

## Theme Colors (from logo)
- Primary Green: #008C45 (Italian flag green)
- Primary Red: #CD212A (Italian flag red)
- White: #FFFFFF
- Dark/Black: #1A1A1A (for text, borders)

## Google API Key
```
AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I
```

## Data Files Location
- Churches Order 1: `D:\Personel\Freelance\Fiverr\Janello\Italian Envl - Churches\Data\Italian Enclaves Database of Churches - Order1.xlsx`
- Churches Order 2: `D:\Personel\Freelance\Fiverr\Janello\Italian Envl - Churches\Data\Italian Enclaves Database of Churches - Order2.xlsx`
- Enclaves (Order 2): `D:\Personel\Freelance\Fiverr\Janello\Italian Envl - Churches\Data\Italian Enclaves Database of Enclaves.xlsx`
- WP Export (Order 3): `theitalianenclaveshistoricalsociety.WordPress.2026-04-28.xml` (in repo root, gitignored)
- Link status Excel outputs: `Enclaves_Link_Status.xlsx`, `Churches_Link_Status.xlsx` (repo root)
- Logo: `D:\Personel\Freelance\Fiverr\Janello\Italian Envl - Churches\Data\italianenclaves-logo.png`

## Database Schema (Churches)
```sql
CREATE TABLE churches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  year_founded INTEGER,
  notes TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  formatted_address TEXT,
  google_place_id VARCHAR(255),
  google_photos JSONB,
  google_rating DECIMAL(3,1),
  google_url TEXT,
  website TEXT,
  church_page_url TEXT,        -- italianenclaves.org page URL (Order 3)
  phone VARCHAR(50),
  enrichment_status VARCHAR(20) DEFAULT 'pending',
  enrichment_error TEXT,
  enrichment_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Database Schema (Enclaves)
```sql
CREATE TABLE enclaves (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  region VARCHAR(100),
  blurb_status VARCHAR(100),
  links TEXT,
  notes TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  formatted_address TEXT,
  google_place_id VARCHAR(255),
  google_photos JSONB,
  google_rating DECIMAL(3,1),
  google_url TEXT,
  website TEXT,
  enclave_page_url TEXT,       -- italianenclaves.org page URL (Order 3)
  phone VARCHAR(50),
  enrichment_status VARCHAR(20) DEFAULT 'pending',
  enrichment_error TEXT,
  enrichment_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints
- `GET /api/churches` - List all churches (supports bbox)
- `GET /api/churches/:id` - Single church with full details
- `GET /api/churches/search?q=` - Search
- `GET /api/churches/:id/photos` - Proxy Google Photos
- `GET /api/enclaves` - List all enclaves (supports bbox)
- `GET /api/enclaves/:id` - Single enclave with full details
- `GET /api/enclaves/search?q=` - Search
- `GET /api/enclaves/:id/photos` - Proxy Google Photos
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/churches` - Admin church records (sort, paginate)
- `GET /api/admin/enclaves` - Admin enclave records (sort, paginate)
- `POST /api/admin/upload/churches` - Upload churches Excel
- `POST /api/admin/upload/enclaves` - Upload enclaves Excel

## Key Implementation Notes
1. **Enrichment Script**: CLI tool reads Excel, geocodes via Google Places, stores in DB
2. **Photo Proxying**: Backend proxies Google Photos to protect API key (2-step: get photo name then fetch)
3. **Clustering**: @googlemaps/markerclusterer — churches=red circles, enclaves=dark red triangles
4. **Iframe Embedded**: App runs at italianenclavesmap.org, embedded in italianenclaves.org/map/ and homepage via Divi Code module
5. **Admin scroll fix**: `index.css` has `overflow: hidden` for map — AdminApp.css overrides with `overflow-y: auto !important`
6. **Website links (Order 3)**: `enclave_page_url` and `church_page_url` populated from WP XML export via slug-matching script (`website_urls.sql`). Button label: "Visit Page"

## Order 3 Website Links — How It Works
- Exported all WP pages as XML from italianenclaves.org/wp-admin
- Script extracted `/neighborhoods/{region}/{state}/{name}/` and `/churches/...` URLs
- Slugified DB names and fuzzy-matched to WP page slugs
- Ran `website_urls.sql` on server to populate `enclave_page_url` / `church_page_url`
- To update: client fills correct URLs in Excel columns → re-run targeted UPDATEs

## WordPress Site (italianenclaves.org)
- Host: WordPress.com Business plan
- Theme: Divi
- Admin login: italianenclaves / (see memory)
- Map embedded on home page: Divi Code module iframe pointing to italianenclavesmap.org
- Dedicated map page: italianenclaves.org/map/ (not in nav, kept for direct sharing)

## Repository
https://github.com/anawaz1220/italinaenclaves.git

## Deployment
- Server: Hostinger KVM2 VPS — see memory for credentials
- Branch: vercel-deployment
- Deploy flow: git push → SSH → git pull + npm run build + pm2 restart italianenclaves-backend
- Frontend static files: /var/www/html/italianenclaves/
- Backend: /var/www/italianenclaves/, port 3001, proxied via Nginx

## Pending / Future Work
- Client to return corrected Excel with URLs for unmatched records (328 enclaves, 31 churches)
- 11 failed churches + 1 failed enclave (bad location data) — fix if client provides corrections
- Any Order 4 scope TBD by client
