import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Hybrid output: every marketing page is prerendered to static HTML for
// instant mobile loads. Only the lead-intake API route opts into
// server rendering (`export const prerender = false`) so it can POST to a CRM
// without ever exposing API keys to the browser.
//
// The Node adapter is host-agnostic and runs anywhere. Swap it for
// @astrojs/vercel or @astrojs/netlify at deploy time with no code changes.
export default defineConfig({
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  site: 'https://marcopuga.com',
  compressHTML: true,
});
