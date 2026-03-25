import { Router, Request, Response } from 'express';
import * as churchService from '../services/churchService.js';
import { query } from '../db/pool.js';
import { config } from '../config.js';

const router = Router();

// GET /api/churches - List all churches
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

    const churches = await churchService.getAllChurches(bbox);
    res.json({ data: churches, count: churches.length });
  } catch (error) {
    console.error('Error fetching churches:', error);
    res.status(500).json({ error: 'Failed to fetch churches' });
  }
});

// GET /api/churches/search - Search churches
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, state, city, limit, offset } = req.query;
    const churches = await churchService.searchChurches({
      q: q as string,
      state: state as string,
      city: city as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json({ data: churches, count: churches.length });
  } catch (error) {
    console.error('Error searching churches:', error);
    res.status(500).json({ error: 'Failed to search churches' });
  }
});

// GET /api/churches/stats - Get church statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await churchService.getChurchStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/churches/states - Get list of states
router.get('/states', async (_req: Request, res: Response) => {
  try {
    const states = await churchService.getStates();
    res.json({ data: states });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// GET /api/churches/cities/:state - Get cities in a state
router.get('/cities/:state', async (req: Request, res: Response) => {
  try {
    const cities = await churchService.getCitiesByState(req.params.state);
    res.json({ data: cities });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// GET /api/churches/:id - Get single church
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid church ID' });
    }

    const church = await churchService.getChurchById(id);
    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    res.json(church);
  } catch (error) {
    console.error('Error fetching church:', error);
    res.status(500).json({ error: 'Failed to fetch church' });
  }
});

// GET /api/churches/:id/photo/:photoRef - Proxy Google Photos
router.get('/:id/photo/:photoRef', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const maxWidth = req.query.maxwidth || '600';

    // Get church's google_place_id
    const rows = await query<{ google_place_id: string }>(
      'SELECT google_place_id FROM churches WHERE id = $1',
      [id]
    );
    const placeId = rows[0]?.google_place_id;
    if (!placeId) {
      return res.status(404).json({ error: 'No place ID for this church' });
    }

    // Step 1: Fetch fresh photo names from Places API (New)
    // Stored photo_reference values are old-API format and cannot be used directly
    const placeResponse = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': config.googleApiKey,
          'X-Goog-FieldMask': 'photos',
        },
      }
    );

    if (!placeResponse.ok) {
      console.error(`Place fetch failed: ${placeResponse.status} for placeId=${placeId}`);
      return res.status(placeResponse.status).json({ error: 'Failed to get place photos' });
    }

    const placeData = await placeResponse.json() as { photos?: Array<{ name: string }> };
    const photos = placeData.photos;
    if (!photos || photos.length === 0) {
      return res.status(404).json({ error: 'No photos available' });
    }

    // Step 2: Fetch photo media using the full resource name
    const photoName = photos[0].name; // e.g. "places/ChIJ.../photos/AcJnMu..."
    const mediaResponse = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?key=${config.googleApiKey}&maxWidthPx=${maxWidth}`
    );

    if (!mediaResponse.ok) {
      console.error(`Photo media fetch failed: ${mediaResponse.status} for ${photoName}`);
      return res.status(mediaResponse.status).json({ error: 'Failed to fetch photo' });
    }

    const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await mediaResponse.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

export default router;
