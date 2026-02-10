import { query, queryOne } from '../db/pool.js';
import type { Church, ChurchListItem, SearchParams, BoundingBox } from '../types.js';

export async function getAllChurches(bbox?: BoundingBox): Promise<ChurchListItem[]> {
  let sql = `
    SELECT id, name, city, state, latitude, longitude, year_founded
    FROM churches
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

  sql += ' ORDER BY state, city, name';

  const results = await query<ChurchListItem>(sql, params);

  // Convert lat/lng strings to numbers
  return results.map(church => ({
    ...church,
    latitude: church.latitude ? parseFloat(church.latitude as any) : null,
    longitude: church.longitude ? parseFloat(church.longitude as any) : null,
  }));
}

export async function getChurchById(id: number): Promise<Church | null> {
  const church = await queryOne<Church>(
    'SELECT * FROM churches WHERE id = $1',
    [id]
  );

  if (!church) return null;

  // Convert lat/lng strings to numbers
  return {
    ...church,
    latitude: church.latitude ? parseFloat(church.latitude as any) : null,
    longitude: church.longitude ? parseFloat(church.longitude as any) : null,
  };
}

export async function searchChurches(params: SearchParams): Promise<ChurchListItem[]> {
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
    SELECT id, name, city, state, latitude, longitude, year_founded
    FROM churches
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      CASE WHEN name ILIKE $${values.length > 0 ? 1 : paramIndex} THEN 0 ELSE 1 END,
      state, city, name
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  values.push(limit, offset);

  const results = await query<ChurchListItem>(sql, values);

  // Convert lat/lng strings to numbers
  return results.map(church => ({
    ...church,
    latitude: church.latitude ? parseFloat(church.latitude as any) : null,
    longitude: church.longitude ? parseFloat(church.longitude as any) : null,
  }));
}

export async function getChurchStats(): Promise<{
  total: number;
  enriched: number;
  pending: number;
  failed: number;
}> {
  const result = await query<{ status: string; count: string }>(`
    SELECT enrichment_status as status, COUNT(*) as count
    FROM churches
    GROUP BY enrichment_status
  `);

  const stats = {
    total: 0,
    enriched: 0,
    pending: 0,
    failed: 0,
  };

  for (const row of result) {
    const count = parseInt(row.count, 10);
    stats.total += count;
    if (row.status === 'enriched') stats.enriched = count;
    if (row.status === 'pending') stats.pending = count;
    if (row.status === 'failed') stats.failed = count;
  }

  return stats;
}

export async function getStates(): Promise<string[]> {
  const result = await query<{ state: string }>(`
    SELECT DISTINCT state
    FROM churches
    WHERE state IS NOT NULL AND enrichment_status = 'enriched'
    ORDER BY state
  `);
  return result.map((r) => r.state);
}

export async function getCitiesByState(state: string): Promise<string[]> {
  const result = await query<{ city: string }>(`
    SELECT DISTINCT city
    FROM churches
    WHERE state ILIKE $1 AND city IS NOT NULL AND enrichment_status = 'enriched'
    ORDER BY city
  `, [`%${state}%`]);
  return result.map((r) => r.city);
}
