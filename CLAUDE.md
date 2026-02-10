# Italian Enclaves Map Application

## Project Overview
Interactive USA-wide map application for Italian Churches and Italian Enclave Areas, similar to Red Sauce Map (https://map.forkingtasty.com/).

## Current Phase: Order 1 (Churches Only) - COMPLETED
- 316 church records imported from Excel
- 305 churches successfully enriched with Google Places data
- 11 churches failed enrichment (unusual location data - see scripts/failed_enrichments.json)
- Live working map
- No admin panel (Order 2)

### Order 1 Deliverables
- ✅ Backend API running on port 3001
- ✅ Frontend running on port 5173+
- ✅ Search by name/location
- ✅ Click markers to view details with photos
- ✅ Mobile responsive design
- ✅ Italian theme colors from logo

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
- Logo: `D:\Personel\Freelance\Fiverr\Janello\Italian Envl - Churches\Data\italianenclaves-logo.png`
- UI Reference: `D:\Personel\Freelance\Fiverr\Janello\Italian Envl - Churches\Data\Reference SS\`

## Excel Data Structure (Churches)
- Column 0: Church name OR state/city header (auto-detect by checking if year is present)
- Column 1: Location description (neighborhood, city, address hints)
- Column 2: Year founded (empty for header rows)
- Column 3: Notes (optional)

Header rows (state/city context) are identified by:
- No year in column 2
- Text patterns like "Pennsylvania churches", "Philadelphia", "Outside Philadelphia"

## Database Schema (Churches)
```sql
CREATE TABLE churches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  year_founded INTEGER,
  notes TEXT,
  -- Enriched fields
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  formatted_address TEXT,
  google_place_id VARCHAR(255),
  google_photos JSONB, -- Array of photo references
  -- Status
  enrichment_status VARCHAR(20) DEFAULT 'pending', -- pending, enriched, failed
  enrichment_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PostGIS index for geo queries
CREATE INDEX idx_churches_location ON churches USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
```

## API Endpoints (Order 1)
- `GET /api/churches` - List all churches (supports bbox for map viewport)
- `GET /api/churches/:id` - Get single church with full details
- `GET /api/churches/search?q=` - Search by name or location
- `GET /api/churches/:id/photos` - Proxy Google Photos (to hide API key)

## Key Implementation Notes
1. **Enrichment Script**: CLI tool that reads Excel, parses with state context, geocodes via Google Places, stores in DB
2. **Photo Proxying**: Backend proxies Google Photos requests to protect API key
3. **Clustering**: Use @googlemaps/markerclusterer on frontend
4. **Iframe Ready**: App should work embedded in iframe
5. **Mobile First**: Responsive design matching Red Sauce Map

## Repository
https://github.com/anawaz1220/italinaenclaves.git

## Deployment
VPS (details to be provided later)

## Order 2 Scope (Future)
- Enclaves with radius overlays
- Admin panel (upload Excel, trigger enrichment, review/approve)
- Additional filters
- Error record management
