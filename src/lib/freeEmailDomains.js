/**
 * Free Email Domain Detection
 *
 * List of free email providers to skip during automatic product extraction.
 * When a user signs up with a free email (gmail.com, yahoo.com, etc.), we skip
 * the automatic product extraction since there's no company website to scrape.
 *
 * @module lib/freeEmailDomains
 */

/**
 * Comprehensive list of free email domain providers
 * Includes major providers worldwide
 */
export const FREE_EMAIL_DOMAINS = [
  // Major US providers
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',

  // Privacy-focused providers
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'mailfence.com',
  'posteo.de',

  // Other popular providers
  'mail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'web.de',

  // International providers
  '163.com',      // NetEase (China)
  '126.com',      // NetEase (China)
  'qq.com',       // Tencent (China)
  'sina.com',     // Sina (China)
  'sohu.com',     // Sohu (China)
  'naver.com',    // Naver (South Korea)
  'daum.net',     // Daum (South Korea)
  'mail.ru',      // Mail.ru (Russia)
  'rambler.ru',   // Rambler (Russia)
  'rediffmail.com', // Rediff (India)

  // Educational (often used personally)
  'student.com',
  'alumni.com',

  // Temporary/disposable email providers
  'mailinator.com',
  'guerrillamail.com',
  'temp-mail.org',
  '10minutemail.com',
  'throwaway.email',
  'maildrop.cc',
  'getnada.com',

  // Legacy providers
  'att.net',
  'sbcglobal.net',
  'verizon.net',
  'bellsouth.net',
  'comcast.net',
  'cox.net',
  'earthlink.net',
  'charter.net',

  // Other
  'fastmail.com',
  'hushmail.com',
  'inbox.com',
  'lycos.com',
  'rediff.com',
  'rocketmail.com',
  'ymail.com',
  'aim.com',
  'btinternet.com',
  'virginmedia.com',
  'ntlworld.com',
  'talktalk.net',
  'sky.com',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'laposte.net',
  't-online.de',
  'arcor.de',
  'freenet.de',
  'libero.it',
  'virgilio.it',
  'tiscali.it',
  'alice.it'
];

/**
 * Check if an email address uses a free email domain
 *
 * @param {string} email - Email address to check
 * @returns {boolean} True if email uses a free domain, false otherwise
 *
 * @example
 * isFreeEmailDomain('user@gmail.com') // true
 * isFreeEmailDomain('sarah@greptile.com') // false
 */
export function isFreeEmailDomain(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const domain = email.split('@')[1]?.toLowerCase().trim();

  if (!domain) {
    return false;
  }

  return FREE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Extract domain from email address, returning null if it's a free email domain
 *
 * @param {string} email - Email address to extract domain from
 * @returns {string|null} Domain name (e.g., 'greptile.com') or null if free email
 *
 * @example
 * extractDomainFromEmail('user@gmail.com') // null (free email)
 * extractDomainFromEmail('sarah@greptile.com') // 'greptile.com'
 */
export function extractDomainFromEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const domain = email.split('@')[1]?.toLowerCase().trim();

  if (!domain) {
    return null;
  }

  // Return null for free email domains (skip extraction)
  if (FREE_EMAIL_DOMAINS.includes(domain)) {
    return null;
  }

  return domain;
}

/**
 * Get statistics about free email domain coverage
 * Useful for monitoring and debugging
 *
 * @returns {Object} Statistics object
 */
export function getFreeEmailStats() {
  return {
    totalDomains: FREE_EMAIL_DOMAINS.length,
    majorProviders: FREE_EMAIL_DOMAINS.filter(d =>
      ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(d)
    ).length,
    disposableProviders: FREE_EMAIL_DOMAINS.filter(d =>
      d.includes('temp') || d.includes('disposable') || d.includes('throwaway')
    ).length
  };
}

export default {
  FREE_EMAIL_DOMAINS,
  isFreeEmailDomain,
  extractDomainFromEmail,
  getFreeEmailStats
};
