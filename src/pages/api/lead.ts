import type { APIRoute } from 'astro';
import { sendLead, type Lead } from '../../lib/crm';

// Server-rendered endpoint (not prerendered) so it can talk to the CRM.
export const prerender = false;

const REQUIRED = ['intent', 'priceRange', 'timeline', 'preApproved', 'reason'] as const;

export const POST: APIRoute = async ({ request }) => {
  let data: Record<string, unknown>;
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  // Honeypot: real users never fill this hidden field.
  if (typeof data.company === 'string' && data.company.trim() !== '') {
    return json({ ok: true }, 200); // silently accept + drop
  }

  for (const field of REQUIRED) {
    if (!data[field] || String(data[field]).trim() === '') {
      return json({ ok: false, error: `Missing field: ${field}` }, 422);
    }
  }

  const lead: Lead = {
    intent: String(data.intent) as Lead['intent'],
    priceRange: String(data.priceRange),
    timeline: String(data.timeline),
    preApproved: String(data.preApproved ?? 'n/a'),
    reason: String(data.reason).slice(0, 2000),
    name: data.name ? String(data.name).slice(0, 120) : undefined,
    contact: data.contact ? String(data.contact).slice(0, 160) : undefined,
    submittedAt: new Date().toISOString(),
    source: 'marcopuga.com intake form',
  };

  try {
    // import.meta.env carries build-time + runtime env in Astro/Node.
    await sendLead(lead, import.meta.env as unknown as Record<string, string | undefined>);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('[lead] CRM send failed:', err);
    // Don't lose the lead — log it so it can be recovered from server logs.
    console.error('[lead] payload:', JSON.stringify(lead));
    return json({ ok: false, error: 'Something went wrong on our end. Text Marco directly and he\'ll take care of you.' }, 502);
  }
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
