// ---------------------------------------------------------------------------
// SimplyRETS client — the live MLS feed (LERA / SABOR, San Antonio Board of
// REALTORS) behind every listings surface on the site.
//
// Server-only: credentials come from SIMPLYRETS_API_KEY / SIMPLYRETS_API_SECRET
// env vars and never reach the browser. Raw feed data is normalized into the
// small `MlsListing` shape the UI needs, so a vendor change stays contained
// to this file.
//
// Docs: https://docs.simplyrets.com
// ---------------------------------------------------------------------------

import { MARCO_MLS_AGENT_IDS } from '../config';

const API_BASE = 'https://api.simplyrets.com';

// The feed refreshes on the MLS side every few minutes; a short server-side
// cache keeps us fast and well inside the API plan without going stale.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 60;

export interface MlsListing {
  mlsId: number;
  listingId: string;
  status: string;        // Active, Pending, ...
  statusText: string;    // New, Price Change, ...
  price: number;
  originalPrice: number | null;
  address: string;       // street address, title-cased
  city: string;
  state: string;
  zip: string;
  beds: number | null;
  bathsFull: number | null;
  bathsHalf: number | null;
  sqft: number | null;
  lotAcres: number | null;
  type: string | null;     // RES, CND, RNT ...
  subType: string | null;  // SingleFamilyResidence, Townhouse ...
  isRental: boolean;
  daysOnMarket: number | null;
  listDate: string | null;
  photos: string[];
  remarks: string | null;
  officeName: string | null;
  agentName: string | null;
  isMarcoListing: boolean;
  disclaimer: string | null;
  // Detail-page extras (present on single fetch, harmless elsewhere)
  interiorFeatures: string[];
  exteriorFeatures: string[];
  construction: string[];
  flooring: string[];
  heating: string | null;
  cooling: string | null;
  yearBuilt: number | null;
  garageSpaces: number | null;
  pool: string | null;
  stories: number | null;
  subdivision: string | null;
  county: string | null;
  schoolDistrict: string | null;
  hoaFee: number | null;
  hoaFrequency: string | null;
  taxAnnual: number | null;
  taxYear: number | null;
  virtualTourUrl: string | null;
}

export interface SearchResult {
  listings: MlsListing[];
  total: number | null;
  lastUpdate: string | null;
}

export interface SearchParams {
  status?: string;
  limit?: number;
  offset?: number;
  sort?: string;              // -listdate | listprice | -listprice
  q?: string;                 // address / ZIP / MLS # keyword
  cities?: string[];
  minprice?: number;
  maxprice?: number;
  minbeds?: number;
  types?: string[];           // residential | condominium | rental | land ...
  agents?: string[];          // listing agent MLS ids
  count?: boolean;            // ask for X-Total-Count
}

type Env = Record<string, string | undefined>;

export function hasMlsCredentials(env: Env): boolean {
  return Boolean(env.SIMPLYRETS_API_KEY && env.SIMPLYRETS_API_SECRET);
}

// --- tiny in-memory TTL cache (per server instance) ------------------------

interface CacheEntry { at: number; body: unknown; headers: Record<string, string | null> }
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): CacheEntry | undefined {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit;
  if (hit) cache.delete(key);
  return undefined;
}

function cacheSet(key: string, entry: CacheEntry) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, entry);
}

// --- raw fetch --------------------------------------------------------------

async function apiGet(env: Env, path: string, search: URLSearchParams): Promise<CacheEntry> {
  const key = env.SIMPLYRETS_API_KEY;
  const secret = env.SIMPLYRETS_API_SECRET;
  if (!key || !secret) throw new Error('SimplyRETS credentials are not configured');

  const url = `${API_BASE}${path}${search.size ? `?${search}` : ''}`;
  const cached = cacheGet(url);
  if (cached) return cached;

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`SimplyRETS responded ${res.status} for ${path}`);

  const entry: CacheEntry = {
    at: Date.now(),
    body: await res.json(),
    headers: {
      total: res.headers.get('X-Total-Count'),
      lastUpdate: res.headers.get('X-SimplyRETS-LastUpdate'),
    },
  };
  cacheSet(url, entry);
  return entry;
}

// --- normalization ----------------------------------------------------------

/** MLS feeds SHOUT ADDRESSES; present them like a human wrote them. */
function titleCase(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    // Ordinals and directionals read better in their usual forms
    .replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (_m, n, suf) => `${n}${suf.toLowerCase()}`)
    .replace(/\b(Ne|Nw|Se|Sw|Ih|Fm|Cr|Us)\b/g, (m) => m.toUpperCase());
}

function splitList(v: unknown): string[] {
  return typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function toNum(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && isFinite(n) ? n : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeProperty(p: any): MlsListing {
  const agent = p.agent || {};
  const agentId = agent.id != null ? String(agent.id) : '';
  const prop = p.property || {};
  const assoc = p.association || {};
  const tax = p.tax || {};
  const geo = p.geo || {};
  const school = p.school || {};

  return {
    mlsId: p.mlsId,
    listingId: String(p.listingId ?? ''),
    status: p.mls?.status ?? 'Active',
    statusText: p.mls?.statusText ?? '',
    price: p.listPrice ?? 0,
    originalPrice: p.originalListPrice ?? null,
    address: titleCase(p.address?.full) + (p.address?.unit ? ` #${p.address.unit}` : ''),
    city: p.address?.city ?? '',
    state: p.address?.state ?? '',
    zip: p.address?.postalCode ?? '',
    beds: prop.bedrooms ?? null,
    bathsFull: prop.bathsFull ?? null,
    bathsHalf: prop.bathsHalf ?? null,
    sqft: prop.area ?? null,
    lotAcres: toNum(prop.lotSizeArea),
    type: prop.type ?? null,
    subType: prop.subType ?? null,
    isRental: prop.type === 'RNT',
    daysOnMarket: p.mls?.daysOnMarket ?? null,
    listDate: p.listDate ?? null,
    photos: Array.isArray(p.photos) ? p.photos : [],
    remarks: p.remarks ?? null,
    officeName: p.office?.name ?? null,
    agentName: [agent.firstName, agent.lastName].filter(Boolean).join(' ') || null,
    isMarcoListing: (MARCO_MLS_AGENT_IDS as readonly string[]).includes(agentId),
    disclaimer: p.disclaimer ?? null,
    interiorFeatures: splitList(prop.interiorFeatures),
    exteriorFeatures: splitList(prop.exteriorFeatures),
    construction: splitList(prop.construction),
    flooring: splitList(prop.flooring),
    heating: prop.heating ?? null,
    cooling: prop.cooling ?? null,
    yearBuilt: prop.yearBuilt ?? null,
    garageSpaces: toNum(prop.garageSpaces),
    pool: prop.pool ?? null,
    stories: toNum(prop.stories),
    subdivision: prop.subdivision && prop.subdivision !== 'N/A' ? titleCase(prop.subdivision) : null,
    county: geo.county ?? null,
    schoolDistrict: school.district ?? null,
    hoaFee: toNum(assoc.fee),
    hoaFrequency: assoc.frequency ?? null,
    taxAnnual: toNum(tax.taxAnnualAmount),
    taxYear: tax.taxYear ?? null,
    virtualTourUrl: p.virtualTourUrl ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// --- public API -------------------------------------------------------------

export async function searchProperties(env: Env, params: SearchParams = {}): Promise<SearchResult> {
  const qs = new URLSearchParams();
  qs.set('status', params.status ?? 'Active');
  qs.set('limit', String(params.limit ?? 24));
  if (params.offset) qs.set('offset', String(params.offset));
  qs.set('sort', params.sort ?? '-listdate');
  if (params.q) qs.set('q', params.q);
  for (const c of params.cities ?? []) qs.append('cities', c);
  if (params.minprice) qs.set('minprice', String(params.minprice));
  if (params.maxprice) qs.set('maxprice', String(params.maxprice));
  if (params.minbeds) qs.set('minbeds', String(params.minbeds));
  for (const t of params.types ?? []) qs.append('type', t);
  for (const a of params.agents ?? []) qs.append('agent', a);
  if (params.count) qs.set('count', 'true');

  const { body, headers } = await apiGet(env, '/properties', qs);
  const listings = (Array.isArray(body) ? body : []).map(normalizeProperty);
  return {
    listings,
    total: headers.total ? parseInt(headers.total, 10) : null,
    lastUpdate: headers.lastUpdate ?? null,
  };
}

export async function getProperty(env: Env, mlsId: string | number): Promise<MlsListing | null> {
  if (!/^\d+$/.test(String(mlsId))) return null;
  try {
    const { body } = await apiGet(env, `/properties/${mlsId}`, new URLSearchParams());
    return body && (body as { mlsId?: number }).mlsId ? normalizeProperty(body) : null;
  } catch {
    return null; // unknown id → treated as not found
  }
}

/** Marco's own active listings, newest first. */
export async function getMarcoListings(env: Env): Promise<MlsListing[]> {
  const { listings } = await searchProperties(env, {
    agents: [...MARCO_MLS_AGENT_IDS],
    sort: '-listdate',
    limit: 50,
  });
  return listings;
}

// --- display helpers (shared by cards, pages, and the featured script) ------

export function fmtPrice(n: number, isRental = false): string {
  const price = `$${Math.round(n).toLocaleString('en-US')}`;
  return isRental ? `${price}/mo` : price;
}

export function fmtBaths(l: Pick<MlsListing, 'bathsFull' | 'bathsHalf'>): string | null {
  if (l.bathsFull == null) return null;
  const half = l.bathsHalf ? 0.5 * l.bathsHalf : 0;
  const n = l.bathsFull + half;
  return `${n % 1 === 0 ? n : n.toFixed(1)}`;
}

/** "4 bd · 3.5 ba · 2,360 sqft" — mirrors the site's existing spec style. */
export function specsLine(l: MlsListing): string {
  const parts: string[] = [];
  if (l.beds != null) parts.push(`${l.beds} bd`);
  const baths = fmtBaths(l);
  if (baths) parts.push(`${baths} ba`);
  if (l.sqft) parts.push(`${l.sqft.toLocaleString('en-US')} sqft`);
  if (!parts.length && l.lotAcres) parts.push(`${l.lotAcres} acres`);
  return parts.join(' · ');
}
