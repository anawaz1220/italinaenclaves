/**
 * Church Enrichment Script
 *
 * Enriches church records with Google Places API data:
 * - Geocoding (lat/lng)
 * - Formatted address
 * - Place photos
 * - Ratings, website, phone
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const RATE_LIMIT_DELAY = 200; // ms between API calls

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }>;
  rating?: number;
  website?: string;
  formatted_phone_number?: string;
  url?: string;
}

interface FailedEnrichment {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  error: string;
}

async function searchPlace(query: string): Promise<PlaceResult | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', query);
  url.searchParams.set('key', GOOGLE_API_KEY!);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status === 'OK' && data.results && data.results.length > 0) {
    return data.results[0];
  }

  if (data.status === 'ZERO_RESULTS') {
    return null;
  }

  throw new Error(`Google API error: ${data.status} - ${data.error_message || ''}`);
}

async function getPlaceDetails(placeId: string): Promise<Partial<PlaceResult>> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'photos,rating,website,formatted_phone_number,url');
  url.searchParams.set('key', GOOGLE_API_KEY!);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status === 'OK' && data.result) {
    return data.result;
  }

  return {};
}

function buildSearchQuery(name: string, city: string | null, state: string | null, originalLocation: string | null): string {
  const parts: string[] = [name];

  // Add church keyword if not already present
  if (!name.toLowerCase().includes('church') && !name.toLowerCase().includes('chapel')) {
    parts.push('church');
  }

  // Add location context
  if (city) {
    parts.push(city);
  } else if (originalLocation) {
    parts.push(originalLocation);
  }

  if (state) {
    parts.push(state);
  }

  parts.push('USA');

  return parts.join(' ');
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichChurches(batchSize: number = 50, onlyPending: boolean = true) {
  console.log('Starting church enrichment...\n');
  console.log(`API Key: ${GOOGLE_API_KEY?.slice(0, 10)}...`);

  // Get churches to enrich
  let query = `
    SELECT id, name, city, state, original_location, enrichment_attempts
    FROM churches
  `;

  if (onlyPending) {
    query += ` WHERE enrichment_status = 'pending' OR (enrichment_status = 'failed' AND enrichment_attempts < 3)`;
  }

  query += ` ORDER BY id LIMIT $1`;

  const result = await pool.query(query, [batchSize]);
  const churches = result.rows;

  console.log(`Found ${churches.length} churches to enrich\n`);

  const failed: FailedEnrichment[] = [];
  let enriched = 0;
  let failedCount = 0;

  for (let i = 0; i < churches.length; i++) {
    const church = churches[i];
    const progress = `[${i + 1}/${churches.length}]`;

    try {
      const searchQuery = buildSearchQuery(
        church.name,
        church.city,
        church.state,
        church.original_location
      );

      console.log(`${progress} Searching: "${searchQuery}"`);

      // Search for the place
      const place = await searchPlace(searchQuery);

      if (!place) {
        throw new Error('No results found');
      }

      // Get additional details
      const details = await getPlaceDetails(place.place_id);

      // Prepare photos array
      const photos = (place.photos || details.photos || []).slice(0, 5).map(p => ({
        photo_reference: p.photo_reference,
        height: p.height,
        width: p.width,
        html_attributions: p.html_attributions,
      }));

      // Update database
      await pool.query(
        `UPDATE churches SET
          latitude = $1,
          longitude = $2,
          formatted_address = $3,
          google_place_id = $4,
          google_photos = $5,
          google_rating = $6,
          google_url = $7,
          website = $8,
          phone = $9,
          enrichment_status = 'enriched',
          enrichment_error = NULL,
          enrichment_attempts = enrichment_attempts + 1,
          updated_at = NOW()
        WHERE id = $10`,
        [
          place.geometry.location.lat,
          place.geometry.location.lng,
          place.formatted_address,
          place.place_id,
          JSON.stringify(photos),
          details.rating || null,
          details.url || place.url || null,
          details.website || null,
          details.formatted_phone_number || null,
          church.id,
        ]
      );

      console.log(`  ✓ Found: ${place.formatted_address}`);
      enriched++;

    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      console.log(`  ✗ Failed: ${errorMsg}`);

      await pool.query(
        `UPDATE churches SET
          enrichment_status = 'failed',
          enrichment_error = $1,
          enrichment_attempts = enrichment_attempts + 1,
          updated_at = NOW()
        WHERE id = $2`,
        [errorMsg, church.id]
      );

      failed.push({
        id: church.id,
        name: church.name,
        city: church.city,
        state: church.state,
        error: errorMsg,
      });

      failedCount++;
    }

    // Rate limiting
    await sleep(RATE_LIMIT_DELAY);
  }

  // Write failed enrichments to file
  if (failed.length > 0) {
    const failedPath = path.resolve(__dirname, 'failed_enrichments.json');
    fs.writeFileSync(failedPath, JSON.stringify(failed, null, 2));
    console.log(`\nFailed enrichments saved to: ${failedPath}`);
  }

  console.log('\n--- Summary ---');
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total processed: ${churches.length}`);

  await pool.end();
}

// Parse command line args
const args = process.argv.slice(2);
const batchSize = parseInt(args[0]) || 500;
const onlyPending = args[1] !== 'all';

console.log(`Batch size: ${batchSize}`);
console.log(`Mode: ${onlyPending ? 'pending only' : 'all records'}\n`);

enrichChurches(batchSize, onlyPending).catch(console.error);
