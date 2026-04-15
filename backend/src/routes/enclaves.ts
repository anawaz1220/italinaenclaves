import { Router, Request, Response } from 'express';
import * as enclaveService from '../services/enclaveService.js';
import { query } from '../db/pool.js';
import { config } from '../config.js';

const router = Router();

// GET /api/enclaves
router.get('/', async (req: Request, res: Response) => {
  try {
    const { north, south, east, west } = req.query;
    let bbox;
    if (north && south && east && west) {
      bbox = {
        north: parseFloat(north as string),
        south: parseFloat(south as string),
        east: parseFloat(east as string),
        west: parseFloat(west as string),
      };
    }
    const enclaves = await enclaveService.getAllEnclaves(bbox);
    res.json({ data: enclaves, count: enclaves.length });
  } catch (error) {
    console.error('Error fetching enclaves:', error);
    res.status(500).json({ error: 'Failed to fetch enclaves' });
  }
});

// GET /api/enclaves/search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, state, city, limit, offset } = req.query;
    const enclaves = await enclaveService.searchEnclaves({
      q: q as string,
      state: state as string,
      city: city as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json({ data: enclaves, count: enclaves.length });
  } catch (error) {
    console.error('Error searching enclaves:', error);
    res.status(500).json({ error: 'Failed to search enclaves' });
  }
});

// GET /api/enclaves/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const enclave = await enclaveService.getEnclaveById(id);
    if (!enclave) return res.status(404).json({ error: 'Enclave not found' });

    res.json(enclave);
  } catch (error) {
    console.error('Error fetching enclave:', error);
    res.status(500).json({ error: 'Failed to fetch enclave' });
  }
});

// GET /api/enclaves/:id/photo/:photoRef - proxy Google photo
router.get('/:id/photo/:photoRef', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const maxWidth = req.query.maxwidth || '600';

    const rows = await query<{ google_place_id: string }>(
      'SELECT google_place_id FROM enclaves WHERE id = $1',
      [id]
    );
    const placeId = rows[0]?.google_place_id;
    if (!placeId) return res.status(404).json({ error: 'No place ID for this enclave' });

    // Step 1: get fresh photo names
    const placeResponse = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': config.googleApiKey,
          'X-Goog-FieldMask': 'photos',
        },
      }
    );
    if (!placeResponse.ok) return res.status(placeResponse.status).json({ error: 'Failed to get place photos' });

    const placeData = await placeResponse.json() as { photos?: Array<{ name: string }> };
    const photos = placeData.photos;
    if (!photos || photos.length === 0) return res.status(404).json({ error: 'No photos available' });

    // Step 2: fetch photo bytes
    const photoName = photos[0].name;
    const mediaResponse = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?key=${config.googleApiKey}&maxWidthPx=${maxWidth}`
    );
    if (!mediaResponse.ok) return res.status(mediaResponse.status).json({ error: 'Failed to fetch photo' });

    const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await mediaResponse.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error fetching enclave photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

export default router;
