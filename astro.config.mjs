import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// Hybrid output: every marketing page is prerendered to static HTML for
// instant mobile loads. Only the lead-intake API route opts into
// server rendering (`export const prerender = false`) so it can POST to a CRM
// without ever exposing API keys to the browser.
//
// The Vercel adapter emits the `.vercel/output` structure Vercel serves
// natively (static assets + a serverless function for the one dynamic route).
export default defineConfig({
  output: 'hybrid',
  adapter: vercel(),
  site: 'https://marcopuga.com',
  compressHTML: true,
});
