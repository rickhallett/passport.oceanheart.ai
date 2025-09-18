import { z } from 'zod';

const configSchema = z.object({
  PORT: z.string().default('3002'),
  DATABASE_URL: z.string(),
  SECRET_KEY_BASE: z.string(),
  COOKIE_DOMAIN: z.string().optional(),
  JWT_ISSUER: z.string().default('passport.oceanheart.ai'),
  RATE_LIMIT_SIGNIN_ATTEMPTS: z.string().default('10'),
  RATE_LIMIT_SIGNIN_WINDOW_MS: z.string().default('180000'), // 3 minutes
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function loadConfig() {
  const env = {
    PORT: Bun.env.PORT,
    DATABASE_URL: Bun.env.DATABASE_URL,
    SECRET_KEY_BASE: Bun.env.SECRET_KEY_BASE,
    COOKIE_DOMAIN: Bun.env.COOKIE_DOMAIN,
    JWT_ISSUER: Bun.env.JWT_ISSUER,
    RATE_LIMIT_SIGNIN_ATTEMPTS: Bun.env.RATE_LIMIT_SIGNIN_ATTEMPTS,
    RATE_LIMIT_SIGNIN_WINDOW_MS: Bun.env.RATE_LIMIT_SIGNIN_WINDOW_MS,
    NODE_ENV: Bun.env.NODE_ENV as 'development' | 'production' | 'test',
  };

  const parsed = configSchema.safeParse(env);

  if (!parsed.success) {
    console.error('❌ Invalid environment configuration:', parsed.error.errors);
    console.error('\nRequired environment variables:');
    console.error('  DATABASE_URL - PostgreSQL connection string');
    console.error('  SECRET_KEY_BASE - Secret key for JWT and cookie signing');
    console.error('\nOptional environment variables:');
    console.error('  PORT - Server port (default: 3002)');
    console.error('  COOKIE_DOMAIN - Cookie domain for SSO (e.g., .oceanheart.ai)');
    console.error('  JWT_ISSUER - JWT issuer (default: passport.oceanheart.ai)');
    console.error('  RATE_LIMIT_SIGNIN_ATTEMPTS - Max sign-in attempts (default: 10)');
    console.error('  RATE_LIMIT_SIGNIN_WINDOW_MS - Rate limit window in ms (default: 180000)');
    console.error('  NODE_ENV - Environment (development/production/test)');
    process.exit(1);
  }

  return {
    port: parseInt(parsed.data.PORT),
    databaseUrl: parsed.data.DATABASE_URL,
    secretKeyBase: parsed.data.SECRET_KEY_BASE,
    cookieDomain: parsed.data.COOKIE_DOMAIN,
    jwtIssuer: parsed.data.JWT_ISSUER,
    rateLimitSigninAttempts: parseInt(parsed.data.RATE_LIMIT_SIGNIN_ATTEMPTS),
    rateLimitSigninWindowMs: parseInt(parsed.data.RATE_LIMIT_SIGNIN_WINDOW_MS),
    nodeEnv: parsed.data.NODE_ENV,
    isDevelopment: parsed.data.NODE_ENV === 'development',
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
  };
}

export const config = loadConfig();