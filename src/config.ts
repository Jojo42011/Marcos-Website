// ---------------------------------------------------------------------------
// Single source of truth for site-wide constants.
// Change Marco's number, nav, or taglines here — never inline in a component.
// ---------------------------------------------------------------------------

export const SMS_NUMBER = '18302689288'; // digits only, E.164 without '+'
export const SMS_DISPLAY = '(830) 268-9288';

// Prefilled text so a tap from a TikTok video opens the messaging app warm.
export const SMS_PREFILL =
  "Hey Marco — saw your site. I'm looking to ";

export const smsHref = (body: string = SMS_PREFILL) =>
  `sms:+${SMS_NUMBER}?&body=${encodeURIComponent(body)}`;

export const BRAND = {
  name: 'Marco Puga',
  role: 'Real Estate',
  tagline: 'Straight Answers. Real Results.',
  markets: 'San Antonio · Miami',
} as const;

export const NAV = [
  { label: 'Buyers', href: '/buyers' },
  { label: 'Sellers', href: '/sellers' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;
