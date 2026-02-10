# Italian Enclaves - Churches Map

Interactive map application showcasing Italian churches across the United States.

## Quick Start

### Prerequisites
- Node.js 20.x or later
- PostgreSQL 14+ with local access
- Google Maps API key

### Setup

1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ../scripts && npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env` in the root directory
   - Update the Google API key and database credentials

3. **Set up database**
   ```bash
   # Create database (if not exists)
   createdb italianenclaves

   # Run migrations
   cd backend && npm run db:migrate
   ```

4. **Import and enrich data**
   ```bash
   cd scripts

   # Import from Excel
   npx tsx import-excel.ts "path/to/churches.xlsx"

   # Enrich with Google data
   npx tsx enrich.ts 500
   ```

5. **Start the application**
   ```bash
   # From root directory
   npm run dev

   # Or separately:
   cd backend && npm run dev    # API at http://localhost:3001
   cd frontend && npm run dev   # App at http://localhost:5173
   ```

## Project Structure

```
italianenclaves-app/
├── backend/           # Express + TypeScript API
│   ├── src/
│   │   ├── db/        # Database connection and migrations
│   │   ├── routes/    # API routes
│   │   └── services/  # Business logic
│   └── package.json
├── frontend/          # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API client
│   │   └── types/       # TypeScript types
│   └── package.json
├── scripts/           # Data import and enrichment
│   ├── import-excel.ts
│   └── enrich.ts
└── .env               # Environment configuration
```

## API Endpoints

- `GET /api/churches` - List all enriched churches
- `GET /api/churches/:id` - Get church details
- `GET /api/churches/search?q=query` - Search churches
- `GET /api/churches/stats` - Get statistics
- `GET /api/churches/:id/photo/:ref` - Proxy Google Photos

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/italianenclaves

# Google APIs
GOOGLE_API_KEY=your_api_key

# Server
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_MAPS_API_KEY=your_api_key
```

## Deployment

### Build for production

```bash
# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build
```

The frontend build outputs to `frontend/dist/` and can be served by the backend or a static host.

## Data

- **Source**: Excel spreadsheet with church names, locations, years
- **Enrichment**: Google Places API for geocoding, photos, ratings
- **Failed records**: Saved to `scripts/failed_enrichments.json` for manual review

## Current Status (Order 1)

- ✅ 305 Italian churches enriched and mapped
- ✅ Search by name/location
- ✅ Click markers to view details
- ✅ Google Photos integration
- ✅ Mobile responsive design

## Order 2 (Planned)

- Enclave data with radius overlays
- Admin panel for data management
- Additional filters and refinements
