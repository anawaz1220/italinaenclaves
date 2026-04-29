import { query, queryOne } from '../db/pool.js';
import type { BoundingBox, SearchParams } from '../types.js';

export interface EnclaveListItem {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Enclave extends EnclaveListItem {
  notes: string | null;
  links: string | null;
  blurb_status: string | null;
  formatted_address: string | null;
  google_place_id: string | null;
  google_photos: any[];
  google_rating: number | null;
  google_url: string | null;
  website: string | null;
  enclave_page_url: string | null;
  phone: string | null;
  enrichment_status: 'pending' | 'enriched' | 'failed';
  enrichment_error: string | null;
  enrichment_attempts: number;
  created_at: Date;
  updated_at: Date;
}

function parseLatLng<T extends { latitude: any; longitude: any }>(row: T): T {
  return {
    ...row,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
  };
}

export async function getAllEnclaves(bbox?: BoundingBox): Promise<EnclaveListItem[]> {
  let sql = `
    SELECT id, name, city, state, region, latitude, longitude
    FROM enclaves
    WHERE enrichment_status = 'enriched'
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
  `;
  const params: any[] = [];

  if (bbox) {
    sql += `
      AND latitude BETWEEN $1 AND $2
      AND longitude BETWEEN $3 AND $4
    `;
    params.push(bbox.south, bbox.north, bbox.west, bbox.east);
  }

  sql += ' ORDER BY state, name';
  const results = await query<EnclaveListItem>(sql, params);
  return results.map(parseLatLng);
}

export async function getEnclaveById(id: number): Promise<Enclave | null> {
  const row = await queryOne<Enclave>('SELECT * FROM enclaves WHERE id = $1', [id]);
  if (!row) return null;
  return parseLatLng(row);
}

export async function searchEnclaves(params: SearchParams): Promise<EnclaveListItem[]> {
  const { q, state, city, limit = 50, offset = 0 } = params;
  const conditions: string[] = [
    "enrichment_status = 'enriched'",
    'latitude IS NOT NULL',
    'longitude IS NOT NULL',
  ];
  const values: any[] = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(`(
      name ILIKE $${paramIndex}
      OR city ILIKE $${paramIndex}
      OR state ILIKE $${paramIndex}
      OR formatted_address ILIKE $${paramIndex}
    )`);
    values.push(`%${q}%`);
    paramIndex++;
  }

  if (state) {
    conditions.push(`state ILIKE $${paramIndex}`);
    values.push(`%${state}%`);
    paramIndex++;
  }

  if (city) {
    conditions.push(`city ILIKE $${paramIndex}`);
    values.push(`%${city}%`);
    paramIndex++;
  }

  const sql = `
    SELECT id, name, city, state, region, latitude, longitude
    FROM enclaves
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      CASE WHEN name ILIKE $${values.length > 0 ? 1 : paramIndex} THEN 0 ELSE 1 END,
      state, name
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  values.push(limit, offset);

  const results = await query<EnclaveListItem>(sql, values);
  return results.map(parseLatLng);
}

export async function getEnclaveStats(): Promise<{ total: number; enriched: number; pending: number; failed: number }> {
  const result = await query<{ status: string; count: string }>(`
    SELECT enrichment_status as status, COUNT(*) as count
    FROM enclaves GROUP BY enrichment_status
  `);

  const stats = { total: 0, enriched: 0, pending: 0, failed: 0 };
  for (const row of result) {
    const count = parseInt(row.count, 10);
    stats.total += count;
    if (row.status === 'enriched') stats.enriched = count;
    if (row.status === 'pending') stats.pending = count;
    if (row.status === 'failed') stats.failed = count;
  }
  return stats;
}
