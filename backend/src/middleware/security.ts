import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Login attempts only — keyed by IP + email so carrier / shared Wi‑Fi NAT does
 * not lump unrelated users into one bucket (fixes “first login” rate-limit hits).
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip ?? '');
    const email =
      typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim().slice(0, 320) : '';
    return email ? `login:${ip}:${email}` : `login:${ip}`;
  },
  message: { error: 'Too many authentication attempts, please try again later.' },
});

/** Signup spam control — still per-IP, but no longer mixed with /me or push-token traffic. */
export const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Too many signup attempts, please try again later.' },
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Too many verification attempts, please try again later.' },
});
