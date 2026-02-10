import { Router, Request, Response } from 'express';
import * as churchService from '../services/churchService.js';
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
    const { photoRef } = req.params;
    const maxWidth = req.query.maxwidth || '400';

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${config.googleApiKey}`;

    // Redirect to the Google photo URL (or proxy it)
    res.redirect(photoUrl);
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

export default router;
