import { DatabaseService } from "../../config/database";
import { AuthService } from "../../services/auth.service";
import { ROUTES, ERROR_MESSAGES, SUCCESS_MESSAGES } from "../../config/constants";
import { jsonResponse, errorResponse, successResponse } from "../../utils/response";
import { validateSignInInput, validateSignUpInput, extractBearerToken } from "../../utils/validation";
import type { SignInRequest, SignUpRequest } from "../../types/requests";

export class ApiAuthRoutes {
  private authService: AuthService;
  
  constructor(database: DatabaseService) {
    this.authService = new AuthService(database);
  }

  async handle(req: Request, url: URL): Promise<Response | null> {
    const pathname = url.pathname;
    const method = req.method;

    // Sign In
    if (pathname === ROUTES.API_SIGN_IN && method === "POST") {
      return this.signIn(req);
    }

    // Sign Up
    if (pathname === ROUTES.API_SIGN_UP && method === "POST") {
      return this.signUp(req);
    }

    // Sign Out
    if (pathname === ROUTES.API_SIGN_OUT && (method === "DELETE" || method === "POST")) {
      return this.signOut(req);
    }

    // Verify Token
    if (pathname === ROUTES.API_VERIFY && method === "POST") {
      return this.verify(req);
    }

    // Refresh Token
    if (pathname === ROUTES.API_REFRESH && method === "POST") {
      return this.refresh(req);
    }

    // Get Current User
    if (pathname === ROUTES.API_USER && method === "GET") {
      return this.getCurrentUser(req);
    }

    return null;
  }

  private async signIn(req: Request): Promise<Response> {
    try {
      const body = await req.json() as SignInRequest;
      
      // Validate input
      const errors = validateSignInInput(body.email, body.password);
      if (errors.length > 0) {
        return errorResponse(errors.join(", "), 400);
      }

      // Attempt sign in
      const result = await this.authService.signIn(body);
      if (!result) {
        return errorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
      }

      return successResponse({
        user: result.user,
        token: result.token
      }, SUCCESS_MESSAGES.SIGN_IN);
    } catch (error) {
      console.error("Sign in error:", error);
      return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500);
    }
  }

  private async signUp(req: Request): Promise<Response> {
    try {
      const body = await req.json() as SignUpRequest;
      
      // Validate input
      const errors = validateSignUpInput(body.email, body.password, body.passwordConfirmation);
      if (errors.length > 0) {
        return errorResponse(errors.join(", "), 400);
      }

      // Attempt sign up
      const result = await this.authService.signUp(body);
      
      return successResponse({
        user: result.user,
        token: result.token
      }, SUCCESS_MESSAGES.SIGN_UP, 201);
    } catch (error: any) {
      console.error("Sign up error:", error);
      
      if (error.message === ERROR_MESSAGES.USER_EXISTS) {
        return errorResponse(ERROR_MESSAGES.USER_EXISTS, 409);
      }
      
      return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500);
    }
  }

  private async signOut(req: Request): Promise<Response> {
    try {
      const token = extractBearerToken(req.headers.get("authorization"));
      if (!token) {
        return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, 401);
      }

      await this.authService.signOut(token);
      return successResponse(null, SUCCESS_MESSAGES.SIGN_OUT);
    } catch (error) {
      console.error("Sign out error:", error);
      return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500);
    }
  }

  private async verify(req: Request): Promise<Response> {
    try {
      const body = await req.json() as { token: string };
      
      if (!body.token) {
        return errorResponse(ERROR_MESSAGES.INVALID_TOKEN, 400);
      }

      const user = await this.authService.verifyToken(body.token);
      if (!user) {
        return errorResponse(ERROR_MESSAGES.INVALID_TOKEN, 401);
      }

      return successResponse({ valid: true, user });
    } catch (error) {
      console.error("Verify error:", error);
      return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500);
    }
  }

  private async refresh(req: Request): Promise<Response> {
    try {
      const body = await req.json() as { token: string };
      
      if (!body.token) {
        return errorResponse(ERROR_MESSAGES.INVALID_TOKEN, 400);
      }

      const newToken = await this.authService.refreshToken(body.token);
      if (!newToken) {
        return errorResponse(ERROR_MESSAGES.INVALID_TOKEN, 401);
      }

      return successResponse({ token: newToken });
    } catch (error) {
      console.error("Refresh error:", error);
      return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500);
    }
  }

  private async getCurrentUser(req: Request): Promise<Response> {
    try {
      const token = extractBearerToken(req.headers.get("authorization"));
      if (!token) {
        return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, 401);
      }

      const user = await this.authService.getCurrentUser(token);
      if (!user) {
        return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, 401);
      }

      return successResponse({ user });
    } catch (error) {
      console.error("Get current user error:", error);
      return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500);
    }
  }
}