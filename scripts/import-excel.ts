/**
 * Excel Import Script
 *
 * Parses the Churches Excel file and imports into PostgreSQL.
 * Auto-detects state/city header rows and associates churches with their context.
 */

import XLSX from 'xlsx';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// US States for detection
const US_STATES = new Set([
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
]);

interface ParsedChurch {
  name: string;
  originalLocation: string | null;
  city: string | null;
  state: string | null;
  yearFounded: number | null;
  notes: string | null;
}

function detectState(text: string): string | null {
  // Check for "X churches" pattern (e.g., "Pennsylvania churches")
  const churchesMatch = text.match(/^(\w+(?:\s+\w+)?)\s+churches?$/i);
  if (churchesMatch) {
    const potentialState = churchesMatch[1];
    if (US_STATES.has(potentialState)) {
      return potentialState;
    }
  }

  // Check if text is just a state name
  for (const state of US_STATES) {
    if (text.toLowerCase() === state.toLowerCase()) {
      return state;
    }
  }

  // Check for state abbreviation at the end (e.g., "Chester PA")
  const abbrevMatch = text.match(/\b([A-Z]{2})$/);
  if (abbrevMatch) {
    const abbrev = abbrevMatch[1];
    const stateFromAbbrev = getStateFromAbbrev(abbrev);
    if (stateFromAbbrev) return stateFromAbbrev;
  }

  return null;
}

function getStateFromAbbrev(abbrev: string): string | null {
  const abbrevMap: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };
  return abbrevMap[abbrev] || null;
}

function extractCityAndState(location: string, currentState: string | null): { city: string | null; state: string | null } {
  if (!location) return { city: null, state: currentState };

  // Check for "City, State" or "City State" or "City ST" patterns
  const patterns = [
    /^(.+?),?\s+([A-Z]{2})$/,  // "Chester PA" or "Chester, PA"
    /^(.+?),\s*(.+)$/,         // "City, State"
  ];

  for (const pattern of patterns) {
    const match = location.match(pattern);
    if (match) {
      const potentialCity = match[1].trim();
      const potentialState = match[2].trim();

      // Check if second part is a state
      const stateFromAbbrev = getStateFromAbbrev(potentialState);
      if (stateFromAbbrev) {
        return { city: potentialCity, state: stateFromAbbrev };
      }
      if (US_STATES.has(potentialState)) {
        return { city: potentialCity, state: potentialState };
      }
    }
  }

  // If location contains state name, extract it
  for (const state of US_STATES) {
    if (location.toLowerCase().includes(state.toLowerCase())) {
      const city = location.replace(new RegExp(state, 'i'), '').trim().replace(/[-,]$/, '').trim();
      return { city: city || null, state };
    }
  }

  // Location might just be a city/neighborhood
  return { city: location, state: currentState };
}

function isHeaderRow(row: any[]): boolean {
  const name = row[0]?.toString().trim() || '';
  const location = row[1]?.toString().trim() || '';
  const year = row[2];

  // If there's a year, it's likely a church entry
  if (year && !isNaN(parseInt(year))) {
    return false;
  }

  // Check for state header patterns
  if (/churches?$/i.test(name)) {
    return true;
  }

  // Check if name is just a state or city
  if (US_STATES.has(name)) {
    return true;
  }

  // Check for city-like headers (no location, no year)
  if (name && !location && !year) {
    // Could be a city header like "Philadelphia"
    return true;
  }

  // Check for section headers like "Outside Philadelphia"
  if (/^outside\s+/i.test(name) || /^greater\s+/i.test(name)) {
    return true;
  }

  return false;
}

async function importExcel(filePath: string) {
  console.log(`Reading Excel file: ${filePath}\n`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const churches: ParsedChurch[] = [];
  let currentState: string | null = null;
  let currentCity: string | null = null;

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const col0 = row[0]?.toString().trim() || '';
    const col1 = row[1]?.toString().trim() || '';
    const col2 = row[2];
    const col3 = row[3]?.toString().trim() || '';

    if (!col0) continue;

    // Check if this is a header row
    if (isHeaderRow(row)) {
      // Detect if it's a state header
      const detectedState = detectState(col0);
      if (detectedState) {
        currentState = detectedState;
        currentCity = null;
        console.log(`  [State Header] ${col0} -> State: ${currentState}`);
      } else {
        // It's a city/region header
        currentCity = col0;
        console.log(`  [City Header] ${col0}`);
      }
      continue;
    }

    // It's a church entry
    const { city, state } = extractCityAndState(col1, currentState);
    const yearFounded = col2 ? parseInt(col2) : null;

    const church: ParsedChurch = {
      name: col0,
      originalLocation: col1 || null,
      city: city || currentCity,
      state: state || currentState,
      yearFounded: isNaN(yearFounded!) ? null : yearFounded,
      notes: col3 || null,
    };

    churches.push(church);
  }

  console.log(`\nParsed ${churches.length} churches`);

  // Insert into database
  console.log('\nInserting into database...');

  let inserted = 0;
  let skipped = 0;

  for (const church of churches) {
    try {
      // Check if already exists
      const existing = await pool.query(
        'SELECT id FROM churches WHERE name = $1 AND state = $2',
        [church.name, church.state]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO churches (name, original_location, city, state, year_founded, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [church.name, church.originalLocation, church.city, church.state, church.yearFounded, church.notes]
      );
      inserted++;
    } catch (error) {
      console.error(`Error inserting ${church.name}:`, error);
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);
  await pool.end();
}

// Run
const excelPath = process.argv[2] || 'D:\\Personel\\Freelance\\Fiverr\\Janello\\Italian Envl - Churches\\Data\\Italian Enclaves Database of Churches - Order1.xlsx';
importExcel(excelPath).catch(console.error);
