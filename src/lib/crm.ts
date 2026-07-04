// ---------------------------------------------------------------------------
// CRM adapter. The intake form posts to /api/lead, which calls sendLead().
// Which provider actually runs is decided by the CRM_PROVIDER env var, so
// wiring Marco's real CRM is a config change — no form or endpoint rework.
//
// Add a provider by writing one function and registering it in `providers`.
// API keys are read from env here (server-only) and never reach the browser.
// ---------------------------------------------------------------------------

export interface Lead {
  intent: 'buy' | 'sell' | 'both';
  priceRange: string;
  timeline: string;
  preApproved: string;
  reason: string;
  name?: string;
  contact?: string; // phone or email
  submittedAt: string;
  source: string;
}

type Provider = (lead: Lead, env: Record<string, string | undefined>) => Promise<void>;

// Default: log to the server console. Safe for local dev and demos — no keys,
// no external calls, nothing lost. Swap CRM_PROVIDER once Marco picks a CRM.
const consoleProvider: Provider = async (lead) => {
  console.log('[LEAD]', JSON.stringify(lead, null, 2));
};

// Follow Up Boss — a popular real-estate CRM. Fill FUB_API_KEY to enable.
const followUpBoss: Provider = async (lead, env) => {
  const key = env.FUB_API_KEY;
  if (!key) throw new Error('FUB_API_KEY not set');
  const auth = Buffer.from(`${key}:`).toString('base64');
  const res = await fetch('https://api.followupboss.com/v1/events', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: lead.source,
      type: 'Registration',
      message: `Intent: ${lead.intent} | Price: ${lead.priceRange} | Timeline: ${lead.timeline} | Pre-approved: ${lead.preApproved}\nWhy: ${lead.reason}`,
      person: {
        firstName: lead.name || 'Website Lead',
        ...(lead.contact?.includes('@') ? { emails: [{ value: lead.contact }] } : { phones: lead.contact ? [{ value: lead.contact }] : [] }),
      },
    }),
  });
  if (!res.ok) throw new Error(`FUB responded ${res.status}`);
};

// HubSpot — form submissions API. Fill HUBSPOT_ACCESS_TOKEN to enable.
const hubspot: Provider = async (lead, env) => {
  const token = env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN not set');
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        ...(lead.contact?.includes('@') ? { email: lead.contact } : { phone: lead.contact }),
        firstname: lead.name || 'Website Lead',
        lifecyclestage: 'lead',
        hs_lead_status: 'NEW',
        message: `Intent: ${lead.intent} | Price: ${lead.priceRange} | Timeline: ${lead.timeline} | Pre-approved: ${lead.preApproved} | Why: ${lead.reason}`,
      },
    }),
  });
  if (!res.ok) throw new Error(`HubSpot responded ${res.status}`);
};

// Generic webhook (Zapier / Make / n8n) — forward the raw lead as JSON.
const webhook: Provider = async (lead, env) => {
  const url = env.CRM_WEBHOOK_URL;
  if (!url) throw new Error('CRM_WEBHOOK_URL not set');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
};

const providers: Record<string, Provider> = {
  console: consoleProvider,
  followupboss: followUpBoss,
  hubspot,
  webhook,
};

export async function sendLead(lead: Lead, env: Record<string, string | undefined>): Promise<void> {
  const name = (env.CRM_PROVIDER || 'console').toLowerCase();
  const provider = providers[name] ?? consoleProvider;
  await provider(lead, env);
}
