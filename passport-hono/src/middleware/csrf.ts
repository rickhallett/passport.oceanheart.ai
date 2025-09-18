import { MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { randomBytes, createHmac } from 'crypto';
import { config } from '../config';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_FIELD_NAME = '_csrf';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function signToken(token: string): string {
  const hmac = createHmac('sha256', config.secretKeyBase);
  hmac.update(token);
  const signature = hmac.digest('hex');
  return `${token}.${signature}`;
}

function verifyToken(signedToken: string): string | null {
  const parts = signedToken.split('.');
  if (parts.length !== 2) return null;
  
  const [token, signature] = parts;
  const hmac = createHmac('sha256', config.secretKeyBase);
  hmac.update(token);
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) return null;
  return token;
}

export const csrfProtection = (): MiddlewareHandler => {
  return async (c, next) => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      // Generate token for forms
      let csrfCookie = getCookie(c, CSRF_COOKIE_NAME);
      if (!csrfCookie) {
        const token = generateToken();
        const signedToken = signToken(token);
        setCookie(c, CSRF_COOKIE_NAME, signedToken, {
          httpOnly: true,
          secure: config.secureCookies,
          sameSite: 'Lax',
          domain: config.cookieDomain,
          path: '/'
        });
        c.set('csrfToken', token);
      } else {
        const token = verifyToken(csrfCookie);
        if (token) {
          c.set('csrfToken', token);
        }
      }
      
      await next();
      return;
    }
    
    // Skip for API routes that use JWT
    if (c.req.path.startsWith('/api/')) {
      await next();
      return;
    }
    
    // Verify CSRF token for state-changing requests
    const csrfCookie = getCookie(c, CSRF_COOKIE_NAME);
    if (!csrfCookie) {
      return c.text('CSRF token missing', 403);
    }
    
    const cookieToken = verifyToken(csrfCookie);
    if (!cookieToken) {
      return c.text('Invalid CSRF token', 403);
    }
    
    // Get token from form data or header
    let submittedToken: string | undefined;
    
    const contentType = c.req.header('content-type');
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await c.req.parseBody();
      submittedToken = formData[CSRF_FIELD_NAME] as string;
    } else if (contentType?.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      submittedToken = formData.get(CSRF_FIELD_NAME) as string;
    } else {
      submittedToken = c.req.header('X-CSRF-Token');
    }
    
    if (!submittedToken || submittedToken !== cookieToken) {
      return c.text('CSRF token validation failed', 403);
    }
    
    // Rotate token after successful validation
    const newToken = generateToken();
    const signedNewToken = signToken(newToken);
    setCookie(c, CSRF_COOKIE_NAME, signedNewToken, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'Lax',
      domain: config.cookieDomain,
      path: '/'
    });
    c.set('csrfToken', newToken);
    
    await next();
  };
};