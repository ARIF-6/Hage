import dns from 'dns';

const dnsPromises = dns.promises;

// Strict RFC 5322 regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// DNS cache: domain -> { valid, message, ts }
const DNS_CACHE = new Map<string, { valid: boolean; message?: string; ts: number }>();
const DNS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Common disposable / fake email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'yopmail.com',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'throwawaymail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'maildrop.cc',
  'temp-mail.org',
  'fakemail.net',
  'fake.com',
  'test.com',
  'example.com',
  'invalid.com',
  'tempmailo.com',
  'burnerdigital.com',
  'mytempemail.com',
  'inboxkitten.com'
]);

export interface EmailValidationResult {
  valid: boolean;
  message?: string;
  domain?: string;
}

/**
 * Validates email format, disposable provider blacklist,
 * and live DNS MX / A records to confirm the email domain exists and can receive mail.
 */
export async function validateEmailExistence(email: string): Promise<EmailValidationResult> {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email address is required.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Format / Syntax Validation
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { valid: false, message: 'Please provide a valid email address format (e.g., name@domain.com).' };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return { valid: false, message: 'Invalid email address structure.' };
  }

  const [username, domain] = parts;

  if (!username || username.length > 64) {
    return { valid: false, message: 'Invalid email username length.' };
  }

  if (!domain || domain.indexOf('.') === -1 || domain.length > 255) {
    return { valid: false, message: 'Invalid email domain.' };
  }

  // 2. Reject known disposable / fake email domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      domain,
      message: 'Temporary or disposable email addresses are not permitted. Please use a permanent email address.'
    };
  }

  // 3. Live DNS MX & A Record Resolution (with cache)
  const cached = DNS_CACHE.get(domain);
  if (cached && (Date.now() - cached.ts) < DNS_CACHE_TTL_MS) {
    return { valid: cached.valid, domain, message: cached.message };
  }

  const resolveWithTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DNS_TIMEOUT')), timeoutMs))
    ]);
  };

  const cacheAndReturn = (valid: boolean, message?: string) => {
    DNS_CACHE.set(domain, { valid, message, ts: Date.now() });
    return { valid, domain, message };
  };

  try {
    // Check Mail Exchange (MX) records first
    let mxRecords: dns.MxRecord[] = [];
    try {
      mxRecords = await resolveWithTimeout(dnsPromises.resolveMx(domain), 2000);
    } catch (mxError: any) {
      const code = mxError?.code;
      // If domain doesn't exist at all or has no MX records
      if (code === 'ENOTFOUND' || code === 'NXDOMAIN' || code === 'ENODATA' || code === 'ESERVFAIL') {
        // Fallback: Check for an A (host) record (RFC 5321 implicit MX fallback)
        try {
          const aRecords = await resolveWithTimeout(dnsPromises.resolve4(domain), 1500);
          if (aRecords && aRecords.length > 0) {
            return cacheAndReturn(true);
          }
        } catch {
          return cacheAndReturn(false, `The domain "@${domain}" does not exist or has no mail server configured.`);
        }
      } else if (mxError?.message === 'DNS_TIMEOUT') {
        // On timeout, be permissive — allow the email to continue
        return cacheAndReturn(true);
      } else {
        return cacheAndReturn(false, `The domain "@${domain}" could not be resolved. Please verify your email address.`);
      }
    }

    if (mxRecords && mxRecords.length > 0) {
      return cacheAndReturn(true);
    }

    // If MX records list was empty, try A record fallback
    try {
      const aRecords = await resolveWithTimeout(dnsPromises.resolve4(domain), 1500);
      if (aRecords && aRecords.length > 0) {
        return cacheAndReturn(true);
      }
    } catch {
      return cacheAndReturn(false, `The domain "@${domain}" does not exist or cannot accept emails.`);
    }

    return cacheAndReturn(false, `The domain "@${domain}" does not have an active mail exchange (MX) record.`);
  } catch (err: any) {
    // On unexpected errors, be permissive
    return cacheAndReturn(true);
  }
}
