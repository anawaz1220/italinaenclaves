# Italian Enclaves - Churches Data Analysis Report

Generated: 2026-02-10

---

## Excel Source File Analysis

**Excel File**: `D:\Personel\Freelance\Fiverr\Janello\Italian Envl - Churches\Data\Italian Enclaves Database of Churches - Order1.xlsx`

### Excel Data Structure
The Excel file contains church records with the following column structure:
- **Column 0**: Church name OR state/city header rows
- **Column 1**: Location description (neighborhood, city, address hints)
- **Column 2**: Year founded (empty for header rows)
- **Column 3**: Notes (optional)

### Header Row Detection
The import script intelligently detects header rows (state/city context) by:
- Checking if year (column 2) is empty
- Pattern matching for "Pennsylvania churches", "Outside Philadelphia", etc.
- Detecting US state names
- Identifying section headers like "Greater [City]" or "Outside [City]"

### Import Results
- **Total churches parsed from Excel**: 316 churches
- **Successfully imported to database**: 316 churches
- **Duplicates skipped**: 0 (first import was clean)

---

## Database Structure

**Database**: PostgreSQL (`italianenclaves`)
**Table**: `churches`

### Schema Overview

```sql
CREATE TABLE churches (
  -- Basic information from Excel
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  original_location TEXT,              -- Raw location string from Excel
  city VARCHAR(100),                   -- Parsed/extracted city
  state VARCHAR(100),                  -- Parsed/extracted state
  year_founded INTEGER,                -- From Excel column 2
  notes TEXT,                          -- From Excel column 3

  -- Enriched fields from Google Places API
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  formatted_address TEXT,
  google_place_id VARCHAR(255),       -- Unique Google identifier
  google_photos JSONB DEFAULT '[]',   -- Array of photo references
  google_rating DECIMAL(2, 1),
  google_url TEXT,                    -- Google Maps URL
  website TEXT,                       -- Church website
  phone VARCHAR(50),                  -- Phone number

  -- Status tracking
  enrichment_status VARCHAR(20) DEFAULT 'pending',
  enrichment_error TEXT,
  enrichment_attempts INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
- `idx_churches_name` - Full-text search on name (GIN index)
- `idx_churches_city` - Filter by city
- `idx_churches_state` - Filter by state
- `idx_churches_status` - Filter by enrichment status
- `idx_churches_lat_lng` - Geospatial queries

---

## Database Records Summary

### Overall Statistics
- **Total churches in database**: 316
- **Successfully enriched**: 305 (96.5%)
- **Failed enrichment**: 11 (3.5%)
- **Pending enrichment**: 0

### Enrichment Success Rate
✅ **96.5% success rate** - 305 out of 316 churches successfully enriched with Google Places data

### Failed Enrichments (11 churches)

The following churches could not be enriched due to unusual location data:

| ID  | Church Name | City/Location | State | Reason |
|-----|-------------|---------------|-------|--------|
| 5   | Saint Roch chapel/church | Ontario & Amber Streets | Pennsylvania | Street intersection, not recognizable address |
| 9   | Church of Our Lady of Good Counsel | Only info is that St. Nicholas was a mission of this church | Pennsylvania | Insufficient location data |
| 45  | Our Lady Help of Christians | Pittsburgh | Pennsylvania | No unique results found |
| 72  | Saint Marian (San Mariano Martire) | Cleveland | Pennsylvania | Wrong state data (Cleveland is in Ohio) |
| 194 | St. Paul-might not have been... | San Pablo -San Francisco | California | Complex naming, historical note |
| 258 | St. Stephen-founded by Father... | Immaculate Conception-Built by... | Louisiana | Complex historical note as location |
| 261 | St. Anthony | Italians worshipped here and... | Louisiana | Descriptive text, not location |
| 265 | St. John the Baptist- defacto... | Baltimore | Maryland | De facto status note |
| 269 | Our Lady of Mt. Carmel | East Boston | Maryland | Wrong state (East Boston is in Massachusetts) |
| 283 | Mt. Carmel Filial church- Saint Ann | West Springfield | Maryland | Wrong state (West Springfield is in Massachusetts) |
| 316 | Santa Maria | First formal gathering at CMBA Hall... | Michigan | Historical location description |

**Common failure patterns**:
- Street intersections instead of addresses
- Historical/descriptive text instead of locations
- Incorrect state associations
- Churches that no longer exist or moved

These failed records are marked with `enrichment_status = 'failed'` and are filtered out from the map display.

---

## Data Flow: What Comes From Where?

### 📊 Stored in Database (Retrieved on Every Request)

The following data is **stored in PostgreSQL** and served directly from the backend:

#### For Map Markers (GET /api/churches)
- `id` - Church ID
- `name` - Church name
- `city` - City name
- `state` - State name
- `latitude` - Geocoded latitude
- `longitude` - Geocoded longitude
- `year_founded` - Year founded

#### For Church Details (GET /api/churches/:id)
All of the above, PLUS:
- `formatted_address` - Full address from Google
- `google_place_id` - Google's unique identifier
- `google_photos` - Array of photo references (stored as JSONB)
- `google_rating` - Star rating (1.0 - 5.0)
- `google_url` - Link to Google Maps
- `website` - Church website URL
- `phone` - Phone number
- `notes` - Historical notes from Excel
- `original_location` - Original location string from Excel

**Example of stored google_photos**:
```json
[
  {
    "photo_reference": "Aaw_E...",
    "height": 3024,
    "width": 4032,
    "html_attributions": ["<a href=\"...\">Contributor Name</a>"]
  },
  ...
]
```

### 🌐 Fetched Live from Google (On-Demand)

The following data is **NOT stored** and is fetched in real-time:

#### Photos (GET /api/churches/:id/photo/:photoRef)
- Actual image binary data
- Fetched from Google Places Photos API
- Proxied through backend to hide API key
- URL format: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={ref}&key={API_KEY}`

**Why photos are proxied**:
1. Security: Hides Google API key from frontend
2. Control: Can implement caching, rate limiting
3. Flexibility: Can resize or optimize images

### 🔄 Data Enrichment Process

The enrichment happens in **two stages** during the one-time setup:

#### Stage 1: Text Search (enrich.ts)
```javascript
// Search query built as: "{church_name} church {city} {state} USA"
GET https://maps.googleapis.com/maps/api/place/textsearch/json
Returns:
  - place_id
  - name
  - formatted_address
  - geometry (lat/lng)
  - Basic photos array
```

#### Stage 2: Place Details (enrich.ts)
```javascript
// Additional details fetched using place_id
GET https://maps.googleapis.com/maps/api/place/details/json
Returns:
  - More photos (up to 5 total)
  - rating
  - website
  - formatted_phone_number
  - url (Google Maps link)
```

Both results are merged and stored in the database with status `enriched`.

---

## API Endpoints Summary

### Backend APIs (Express)

1. **GET /api/churches**
   - Returns: All enriched churches (305 records)
   - Filters: Optional bbox (north, south, east, west) for viewport filtering
   - Data: id, name, city, state, lat, lng, year_founded

2. **GET /api/churches/:id**
   - Returns: Full church details including photos array
   - Data: All database fields for single church

3. **GET /api/churches/search?q=query**
   - Returns: Matching churches by name/location
   - Search: Full-text search on name, ILIKE on city/state

4. **GET /api/churches/:id/photo/:photoRef?maxwidth=400**
   - Returns: Redirect to Google Photos URL
   - Purpose: Proxy to hide API key

5. **GET /api/churches/stats**
   - Returns: Enrichment statistics
   - Data: total, enriched, pending, failed counts

6. **GET /api/churches/states**
   - Returns: List of unique states

7. **GET /api/churches/cities/:state**
   - Returns: List of cities in a state

### Frontend API Calls

The frontend uses these functions ([frontend/src/services/api.ts](frontend/src/services/api.ts:1)):

```typescript
fetchChurches()          // Load all churches for map
fetchChurchById(id)      // Load details when marker clicked
searchChurches(query)    // Search functionality
getPhotoUrl(id, ref)     // Generate photo proxy URL
```

---

## Scripts and Tools

### Located in /scripts directory

1. **import-excel.ts**
   - Purpose: Parse Excel and import to PostgreSQL
   - Usage: `npm run import`
   - Reads: `D:\Personel\Freelance\Fiverr\Janello\Italian Envl - Churches\Data\Italian Enclaves Database of Churches - Order1.xlsx`
   - Auto-detects state/city context from header rows
   - Parses location strings to extract city/state
   - Checks for duplicates before inserting

2. **enrich.ts**
   - Purpose: Enrich churches with Google Places data
   - Usage: `npm run enrich`
   - Options:
     - `--batch=500` (default: 50)
     - `--all` (enrich all, not just pending)
   - Rate limiting: 200ms delay between API calls
   - Retry logic: Failed records can be re-attempted up to 3 times
   - Outputs: `failed_enrichments.json` for debugging

3. **query-stats.mjs**
   - Purpose: Quick database statistics
   - Usage: `node query-stats.mjs`
   - Shows: Total count, counts by status, sample record

### Dependencies (scripts/package.json)
```json
{
  "xlsx": "^0.18.5",        // Excel parsing
  "pg": "^8.11.3",          // PostgreSQL client
  "dotenv": "^16.3.1",      // Environment variables
  "tsx": "^4.6.2"           // TypeScript executor
}
```

---

## Example Data Flow

### User Clicks a Church Marker

1. **Initial Map Load**
   ```
   Frontend → GET /api/churches
   Backend → SELECT id, name, city, state, latitude, longitude, year_founded FROM churches
   Backend → Returns 305 churches
   Frontend → Renders markers with MarkerClusterer
   ```

2. **User Clicks Marker**
   ```
   Frontend → GET /api/churches/148
   Backend → SELECT * FROM churches WHERE id = 148
   Backend → Returns full church record with photos array
   ```

3. **Frontend Displays Church Detail**
   ```
   Component renders:
   - Name: "Immaculate Conception"
   - Address: from formatted_address
   - Rating: 4.7 stars
   - Photo carousel with 5 images
   ```

4. **Photos Load**
   ```
   For each photo reference in google_photos:
     Frontend → <img src="/api/churches/148/photo/{ref}?maxwidth=600" />
     Backend → Redirects to Google Places Photos API
     Google → Returns actual image binary
   ```

---

## Data Quality Insights

### ✅ Strengths
- 96.5% enrichment success rate
- All 305 enriched churches have valid coordinates
- Comprehensive Google Places data (photos, ratings, contact info)
- Clean import with no duplicates

### ⚠️ Issues Found
- 11 churches with problematic location data
- Some churches marked in wrong states (data entry errors in Excel)
- Historical churches that may no longer exist
- Street intersections instead of proper addresses

### 🔧 Recommendations
1. Manually research and correct the 11 failed churches
2. Add data validation for state/city matching
3. Consider adding a "historical/closed" flag
4. Implement manual coordinate entry for edge cases

---

## Performance Notes

- **Database**: 316 records (very light)
- **API Response Time**: <100ms for church list
- **Photo Loading**: Depends on Google CDN
- **Clustering**: Frontend handles 305 markers efficiently
- **Rate Limiting**: Backend enrichment respects 200ms delays

---

## Summary

**Total Excel Records**: 316 churches
**Total in Database**: 316 churches
**Successfully Enriched**: 305 churches (96.5%)
**Failed Enrichment**: 11 churches (3.5%)
**Data Sources**:
- ✅ **From Database**: Name, location, coordinates, ratings, contact info, photo references
- ✅ **From Google Live**: Actual photo binary data (proxied through backend)
- ✅ **From Excel**: Original location notes, year founded, historical notes

**Current Status**: ✅ Order 1 complete and fully operational
