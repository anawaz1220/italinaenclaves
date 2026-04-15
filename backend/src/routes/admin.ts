import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { query } from '../db/pool.js';
import { config } from '../config.js';

const router = Router();

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers['x-admin-key'];
  if (!auth || auth !== config.adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

// ─── File upload setup ────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [churchStats, enclaveStats] = await Promise.all([
      query<{ status: string; count: string }>(`SELECT enrichment_status as status, COUNT(*) as count FROM churches GROUP BY enrichment_status`),
      query<{ status: string; count: string }>(`SELECT enrichment_status as status, COUNT(*) as count FROM enclaves GROUP BY enrichment_status`),
    ]);

    const toStats = (rows: { status: string; count: string }[]) => {
      const s = { total: 0, enriched: 0, pending: 0, failed: 0 };
      for (const r of rows) {
        const c = parseInt(r.count);
        s.total += c;
        if (r.status === 'enriched') s.enriched = c;
        if (r.status === 'pending') s.pending = c;
        if (r.status === 'failed') s.failed = c;
      }
      return s;
    };

    res.json({ churches: toStats(churchStats), enclaves: toStats(enclaveStats) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

const ALLOWED_SORT_COLS = ['id', 'name', 'city', 'state', 'enrichment_status', 'formatted_address', 'updated_at'];

// ─── GET /api/admin/churches ──────────────────────────────────────────────────
router.get('/churches', async (req: Request, res: Response) => {
  try {
    const { status, q, limit = '50', offset = '0', sort = 'id', order = 'DESC' } = req.query as Record<string, string>;
    const safeSort = ALLOWED_SORT_COLS.includes(sort) ? sort : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const conditions: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (status) { conditions.push(`enrichment_status = $${i++}`); values.push(status); }
    if (q) { conditions.push(`(name ILIKE $${i} OR city ILIKE $${i} OR state ILIKE $${i})`); values.push(`%${q}%`); i++; }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const rows = await query(
      `SELECT id, name, city, state, year_founded, enrichment_status, enrichment_error, enrichment_attempts, formatted_address, latitude, longitude, updated_at
       FROM churches ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT $${i} OFFSET $${i + 1}`,
      [...values, parseInt(limit), parseInt(offset)]
    );
    const [{ count }] = await query<{ count: string }>(`SELECT COUNT(*) as count FROM churches ${where}`, values);
    res.json({ data: rows, total: parseInt(count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch churches' });
  }
});

// ─── GET /api/admin/enclaves ──────────────────────────────────────────────────
router.get('/enclaves', async (req: Request, res: Response) => {
  try {
    const { status, q, limit = '50', offset = '0', sort = 'id', order = 'DESC' } = req.query as Record<string, string>;
    const safeSort = ALLOWED_SORT_COLS.includes(sort) ? sort : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const conditions: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (status) { conditions.push(`enrichment_status = $${i++}`); values.push(status); }
    if (q) { conditions.push(`(name ILIKE $${i} OR city ILIKE $${i} OR state ILIKE $${i})`); values.push(`%${q}%`); i++; }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const rows = await query(
      `SELECT id, name, city, state, region, enrichment_status, enrichment_error, enrichment_attempts, formatted_address, latitude, longitude, updated_at
       FROM enclaves ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT $${i} OFFSET $${i + 1}`,
      [...values, parseInt(limit), parseInt(offset)]
    );
    const [{ count }] = await query<{ count: string }>(`SELECT COUNT(*) as count FROM enclaves ${where}`, values);
    res.json({ data: rows, total: parseInt(count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enclaves' });
  }
});

// ─── DELETE /api/admin/churches/:id ──────────────────────────────────────────
router.delete('/churches/:id', async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM churches WHERE id = $1', [parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete church' });
  }
});

// ─── DELETE /api/admin/enclaves/:id ──────────────────────────────────────────
router.delete('/enclaves/:id', async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM enclaves WHERE id = $1', [parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete enclave' });
  }
});

// ─── POST /api/admin/upload/churches ─────────────────────────────────────────
router.post('/upload/churches', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let inserted = 0, skipped = 0;
    let currentState: string | null = null;

    const US_STATES = new Set(['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','District of Columbia']);

    for (const row of rows) {
      if (!row || !row[0]) continue;
      const name = row[0]?.toString().trim();
      const loc = row[1]?.toString().trim() || null;
      const year = row[2] ? parseInt(row[2]) : null;
      const notes = row[3]?.toString().trim() || null;

      if (!year && US_STATES.has(name)) { currentState = name; continue; }
      if (!year && /churches?$/i.test(name)) { currentState = name.replace(/\s*churches?$/i, '').trim(); continue; }
      if (!name || isNaN(year as number) && !year) continue;

      const existing = await query('SELECT id FROM churches WHERE name = $1 AND state = $2', [name, currentState]);
      if ((existing as any[]).length > 0) { skipped++; continue; }

      await query(
        `INSERT INTO churches (name, original_location, city, state, year_founded, notes, enrichment_status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
        [name, loc, loc, currentState, isNaN(year as number) ? null : year, notes]
      );
      inserted++;
    }

    res.json({ success: true, inserted, skipped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/upload/enclaves ─────────────────────────────────────────
router.post('/upload/enclaves', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let inserted = 0, skipped = 0;

    for (const row of rows) {
      if (!row || !row[0]) continue;
      const name = row[0]?.toString().trim();
      if (!name || name === 'Neighborhood') continue;

      const city = row[1]?.toString().trim() || null;
      const state = row[2]?.toString().trim() || null;
      const region = row[3]?.toString().trim() || null;
      const blurbStatus = row[4]?.toString().trim() || null;
      const links = row[8]?.toString().trim() || null;
      const notes = row[13]?.toString().trim() || null;

      const existing = await query('SELECT id FROM enclaves WHERE name = $1 AND state = $2', [name, state]);
      if ((existing as any[]).length > 0) { skipped++; continue; }

      await query(
        `INSERT INTO enclaves (name, city, state, region, blurb_status, links, notes, enrichment_status) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
        [name, city, state, region, blurbStatus, links, notes]
      );
      inserted++;
    }

    res.json({ success: true, inserted, skipped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/enrich/churches ─────────────────────────────────────────
// Triggers enrichment for failed/pending churches in background
router.post('/enrich/churches', async (_req: Request, res: Response) => {
  try {
    const pending = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM churches WHERE enrichment_status IN ('pending','failed')`
    );
    const count = parseInt(pending[0].count);
    if (count === 0) return res.json({ message: 'No pending churches to enrich', count: 0 });

    // Reset failed to pending for re-enrichment
    await query(`UPDATE churches SET enrichment_status = 'pending', enrichment_error = NULL WHERE enrichment_status = 'failed'`);

    res.json({ message: `Enrichment queued for ${count} churches. Run the enrich script on the server.`, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue enrichment' });
  }
});

// ─── POST /api/admin/enrich/enclaves ─────────────────────────────────────────
router.post('/enrich/enclaves', async (_req: Request, res: Response) => {
  try {
    const pending = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM enclaves WHERE enrichment_status IN ('pending','failed')`
    );
    const count = parseInt(pending[0].count);
    if (count === 0) return res.json({ message: 'No pending enclaves to enrich', count: 0 });

    await query(`UPDATE enclaves SET enrichment_status = 'pending', enrichment_error = NULL WHERE enrichment_status = 'failed'`);

    res.json({ message: `Enrichment queued for ${count} enclaves. Run the enrich script on the server.`, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue enrichment' });
  }
});

export default router;
