import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

const addressSearchSchema = z.object({
  q: z.string().trim().min(3).max(200),
});

const featureSchema = z.object({
  properties: z.record(z.unknown()),
  geometry: z.object({
    coordinates: z.array(z.number().finite()).min(2),
  }),
});

interface AddressResult {
  id: string;
  label: string;
  line1: string;
  line2: string;
  lat: number;
  lng: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, { expiresAt: number; results: AddressResult[] }>();

const addressSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  // Authentication runs first, so every request here has a validated user id.
  keyGenerator: (req) => req.user!.userId,
  message: { error: 'Too many requests, please try again later.' },
});

const addressText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/\s+/g, ' ').trim()
    : '';

const mapFeatures = (features: unknown[]): AddressResult[] => {
  const results: AddressResult[] = [];
  const labels = new Set<string>();

  for (const feature of features) {
    const parsed = featureSchema.safeParse(feature);
    if (!parsed.success) continue;

    const { properties, geometry } = parsed.data;
    const [lng, lat] = geometry.coordinates;
    const street = addressText(properties.street);
    const name = addressText(properties.name);
    const city = addressText(properties.city);
    let line1 = street
      ? `${street} ${addressText(properties.housenumber)}`.trim()
      : name || city;
    if (street && name && name !== street && properties.type !== 'house') {
      line1 = `${name}, ${line1}`;
    }
    const line2 = [
      `${addressText(properties.postcode)} ${city}`.trim(),
      addressText(properties.state),
      addressText(properties.country),
    ].filter((part) => part && part !== line1).join(', ');
    const label = [line1, line2].filter(Boolean).join(', ');
    if (labels.has(label)) continue;
    labels.add(label);
    results.push({
      id: `${addressText(properties.osm_type)}${addressText(properties.osm_id)}`,
      label,
      line1,
      line2,
      lat,
      lng,
    });
  }

  return results;
};

// GET /geo/address-search
router.get('/address-search', authMiddleware, addressSearchLimiter, async (req: Request, res: Response) => {
  const parsed = addressSearchSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
  }

  const { q } = parsed.data;
  const lang = typeof req.query.lang === 'string' && ['en', 'de', 'fr'].includes(req.query.lang)
    ? req.query.lang
    : '';
  const cacheKey = `${lang}|${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ results: cached.results });
  }
  cache.delete(cacheKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '6');
    if (lang) url.searchParams.set('lang', lang);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'RoomateApp/1.0 (household address lookup)' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return res.status(503).json({ error: 'Address lookup unavailable' });
    }
    const payload = z.object({ features: z.array(z.unknown()) }).parse(await response.json());
    const results = mapFeatures(payload.features);
    // Delete before inserting so concurrent misses preserve insertion order.
    cache.delete(cacheKey);
    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, results });
    return res.json({ results });
  } catch {
    return res.status(503).json({ error: 'Address lookup unavailable' });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
