import { Elysia, Context } from 'elysia';
import { generateSecureToken } from '../utils/hash';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';
const CSRF_FIELD = 'csrf_token';

interface CsrfContext {
  csrf?: {
    token: string;
    validate: (token?: string) => boolean;
  };
}

/**
 * CSRF protection middleware
 * Issues and validates CSRF tokens for state-changing requests
 */
export const csrfMiddleware = new Elysia({ name: 'csrf-middleware' })
  .derive(async ({ request, cookie, set }): Promise<CsrfContext> => {
    // Get or generate CSRF token
    let csrfToken = cookie[CSRF_COOKIE]?.value;
    
    if (!csrfToken) {
      csrfToken = generateSecureToken(CSRF_TOKEN_LENGTH);
      // Set CSRF cookie
      set.cookie = {
        ...set.cookie,
        [CSRF_COOKIE]: {
          value: csrfToken,
          httpOnly: true,
          secure: Bun.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        },
      };
    }
    
    // Validation function
    const validate = (token?: string): boolean => {
      if (!token || !csrfToken) return false;
      
      // Constant-time comparison
      if (token.length !== csrfToken.length) return false;
      
      let valid = true;
      for (let i = 0; i < token.length; i++) {
        if (token[i] !== csrfToken[i]) {
          valid = false;
        }
      }
      return valid;
    };
    
    return {
      csrf: {
        token: csrfToken,
        validate,
      },
    };
  })
  .onBeforeHandle(async ({ request, headers, body, csrf, set, path }: Context & CsrfContext) => {
    // Skip CSRF check for safe methods and API routes
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return;
    }
    
    // Skip CSRF for API routes (they use JWT auth)
    if (path.startsWith('/api/')) {
      return;
    }
    
    // Extract CSRF token from request
    let requestToken: string | undefined;
    
    // Check header first
    requestToken = headers[CSRF_HEADER];
    
    // Check form data
    if (!requestToken && body && typeof body === 'object') {
      requestToken = (body as any)[CSRF_FIELD];
    }
    
    // Validate token
    if (!csrf?.validate(requestToken)) {
      set.status = 403;
      return {
        error: 'Forbidden',
        message: 'Invalid CSRF token',
      };
    }
  });

/**
 * Helper to get CSRF token from context
 */
export function getCsrfToken(context: Context & CsrfContext): string | null {
  return context.csrf?.token || null;
}

/**
 * Helper to generate CSRF hidden field for forms
 */
export function csrfField(context: Context & CsrfContext): string {
  const token = getCsrfToken(context);
  if (!token) return '';
  
  return `<input type="hidden" name="${CSRF_FIELD}" value="${token}" />`;
}

/**
 * Helper to generate CSRF meta tag for AJAX requests
 */
export function csrfMetaTag(context: Context & CsrfContext): string {
  const token = getCsrfToken(context);
  if (!token) return '';
  
  return `<meta name="csrf-token" content="${token}" />`;
}