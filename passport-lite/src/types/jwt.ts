export interface JWTPayload {
  userId: number;
  email: string;
  exp: number;
  iat: number;
  iss: string;
}

export interface JWTHeader {
  alg: string;
  typ: string;
}

export interface TokenPair {
  token: string;
  refreshToken?: string;
  expiresIn: number;
}