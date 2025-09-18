export interface Config {
  port: number;
  databaseUrl: string;
  secretKeyBase: string;
  cookieDomain: string;
  jwtIssuer: string;
  rateLimitSigninAttempts: number;
  rateLimitSigninWindowMs: number;
  env: 'development' | 'production' | 'test';
  secureCookies: boolean;
}

function requireEnv(name: string): string {
  const value = Bun.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: Config = {
  port: parseInt(Bun.env.PORT || '3003', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  secretKeyBase: requireEnv('SECRET_KEY_BASE'),
  cookieDomain: Bun.env.COOKIE_DOMAIN || (
    Bun.env.ENV === 'production' ? '.oceanheart.ai' : '.lvh.me'
  ),
  jwtIssuer: Bun.env.JWT_ISSUER || 'passport.oceanheart.ai',
  rateLimitSigninAttempts: parseInt(Bun.env.RATE_LIMIT_SIGNIN_ATTEMPTS || '10', 10),
  rateLimitSigninWindowMs: parseInt(Bun.env.RATE_LIMIT_SIGNIN_WINDOW_MS || '180000', 10),
  env: (Bun.env.ENV || 'development') as 'development' | 'production' | 'test',
  secureCookies: Bun.env.ENV === 'production'
};

export function isDevelopment(): boolean {
  return config.env === 'development';
}

export function isProduction(): boolean {
  return config.env === 'production';
}

export function isTest(): boolean {
  return config.env === 'test';
}