export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function sanitizeInput(input: string): string {
  return input.trim();
}

export function validateSignInInput(email: string, password: string): string[] {
  const errors: string[] = [];
  
  if (!email || !isValidEmail(email)) {
    errors.push("Please provide a valid email address");
  }
  
  if (!password) {
    errors.push("Password is required");
  }
  
  return errors;
}

export function validateSignUpInput(
  email: string,
  password: string,
  passwordConfirmation?: string
): string[] {
  const errors: string[] = [];
  
  if (!email || !isValidEmail(email)) {
    errors.push("Please provide a valid email address");
  }
  
  if (!password || !isValidPassword(password)) {
    errors.push("Password must be at least 8 characters");
  }
  
  if (passwordConfirmation !== undefined && password !== passwordConfirmation) {
    errors.push("Passwords do not match");
  }
  
  return errors;
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}