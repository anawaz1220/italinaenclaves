import { pool } from './pool.js';

const migrations = [
  {
    name: '001_create_churches_table',
    sql: `
      CREATE TABLE IF NOT EXISTS churches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        original_location TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        year_founded INTEGER,
        notes TEXT,

        -- Enriched fields from Google
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        formatted_address TEXT,
        google_place_id VARCHAR(255),
        google_photos JSONB DEFAULT '[]',
        google_rating DECIMAL(2, 1),
        google_url TEXT,
        website TEXT,
        phone VARCHAR(50),

        -- Status tracking
        enrichment_status VARCHAR(20) DEFAULT 'pending',
        enrichment_error TEXT,
        enrichment_attempts INTEGER DEFAULT 0,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Create index for text search
      CREATE INDEX IF NOT EXISTS idx_churches_name ON churches USING gin(to_tsvector('english', name));
      CREATE INDEX IF NOT EXISTS idx_churches_city ON churches(city);
      CREATE INDEX IF NOT EXISTS idx_churches_state ON churches(state);
      CREATE INDEX IF NOT EXISTS idx_churches_status ON churches(enrichment_status);
    `,
  },
  {
    name: '002_create_spatial_index',
    sql: `
      -- Create spatial index for geo queries (works without PostGIS too)
      CREATE INDEX IF NOT EXISTS idx_churches_lat_lng ON churches(latitude, longitude);
    `,
  },
];

async function migrate() {
  console.log('Running migrations...\n');

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    // Check if migration already ran
    const result = await pool.query(
      'SELECT id FROM migrations WHERE name = $1',
      [migration.name]
    );

    if (result.rows.length > 0) {
      console.log(`✓ ${migration.name} (already executed)`);
      continue;
    }

    try {
      await pool.query(migration.sql);
      await pool.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration.name]
      );
      console.log(`✓ ${migration.name} (executed)`);
    } catch (error) {
      console.error(`✗ ${migration.name} (failed):`, error);
      throw error;
    }
  }

  console.log('\nMigrations complete!');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
