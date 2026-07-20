// ---------------------------------------------------------------------------
// Single source of truth for site-wide constants.
// Change Marco's number, nav, or taglines here — never inline in a component.
// ---------------------------------------------------------------------------

export const SMS_NUMBER = '18302689288'; // digits only, E.164 without '+'
export const SMS_DISPLAY = '(830) 268-9288';

// Prefilled text so a tap opens the messaging app ready to go.
export const SMS_PREFILL =
  "Hi Marco, I saw your website. I'm looking to ";

export const smsHref = (body: string = SMS_PREFILL) =>
  `sms:+${SMS_NUMBER}?&body=${encodeURIComponent(body)}`;

// Marco's direct email.
export const EMAIL = 'pmarcopuga@gmail.com';
export const mailtoHref = (address: string) => `mailto:${address}`;

// Brokerage / office details. Required on the site for MLS compliance:
// every listing agent must display their sponsoring broker's name,
// address, and contact info. Marco is brokered by eXp Realty.
export const OFFICE = {
  brokerage: 'eXp Realty',
  addressLine1: '17806 W IH 10, Ste. 300',
  addressLine2: 'San Antonio, TX 78257',
  address: '17806 W IH 10, Ste. 300, San Antonio, TX 78257',
  email: 'marco.puga@exprealty.com',
  phone: '12108012380',        // E.164 without '+'
  phoneDisplay: '(210) 801-2380',
} as const;

export const telHref = (digits: string) => `tel:+${digits}`;

export const BRAND = {
  name: 'Marco Puga',
  role: 'Real Estate',
  tagline: 'Trusted representation across Texas and Miami.',
  markets: 'Texas · Miami',
} as const;

export const NAV = [
  { label: 'Buyers', href: '/buyers' },
  { label: 'Sellers', href: '/sellers' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;
