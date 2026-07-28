import type { APIRoute } from 'astro';
import {
  hasMlsCredentials,
  getMarcoListings,
  searchProperties,
  specsLine,
  fmtPrice,
  type MlsListing,
} from '../../lib/simplyrets';

// Server-rendered JSON feed for the homepage "Featured Listings" carousel.
// The homepage itself stays prerendered/static for speed; this endpoint is
// fetched client-side and is CDN-cached, so the MLS API is barely touched.
export const prerender = false;

const FEATURED_COUNT = 10;

// Only what the card needs — keeps the payload tiny.
function toCard(l: MlsListing) {
  return {
    mlsId: l.mlsId,
    price: fmtPrice(l.price, l.isRental),
    address: `${l.address}, ${l.city}, ${l.state} ${l.zip}`,
    specs: specsLine(l),
    photo: l.photos[0] ?? null,
    href: `/listings/${l.mlsId}`,
    isMarco: l.isMarcoListing,
    isNew: l.statusText === 'New' || (l.daysOnMarket != null && l.daysOnMarket <= 7),
    office: l.officeName,
  };
}

export const GET: APIRoute = async () => {
  const env = import.meta.env as unknown as Record<string, string | undefined>;

  if (!hasMlsCredentials(env)) {
    return json({ ok: false, error: 'MLS feed not configured.' }, 503);
  }

  try {
    // Marco's own listings lead; fresh premium San Antonio area homes with
    // photos round the carousel out to a full set.
    const marco = (await getMarcoListings(env)).filter((l) => l.photos.length > 0);
    let cards = marco.map(toCard);

    if (cards.length < FEATURED_COUNT) {
      const { listings } = await searchProperties(env, {
        types: ['residential'],
        minprice: 400000,
        sort: '-listdate',
        limit: 30,
      });
      const seen = new Set(cards.map((c) => c.mlsId));
      for (const l of listings) {
        if (cards.length >= FEATURED_COUNT) break;
        if (seen.has(l.mlsId) || !l.photos.length || !l.beds) continue;
        cards.push(toCard(l));
        seen.add(l.mlsId);
      }
    }

    return json({ ok: true, listings: cards.slice(0, FEATURED_COUNT) }, 200, {
      // Vercel CDN: serve cached for 15 min, refresh in the background for 1 h.
      'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600',
    });
  } catch (err) {
    console.error('[listings] feed failed:', err);
    return json({ ok: false, error: 'MLS feed unavailable.' }, 502);
  }
};

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
