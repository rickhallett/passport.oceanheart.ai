import { DatabaseService } from "../config/database";
import { ApiAuthRoutes } from "./api/auth.routes";
import { errorResponse } from "../utils/response";

export class Router {
  private apiAuthRoutes: ApiAuthRoutes | null = null;

  async handle(req: Request, database: DatabaseService): Promise<Response> {
    const url = new URL(req.url);
    
    // Initialize routes if not already done
    if (!this.apiAuthRoutes) {
      this.apiAuthRoutes = new ApiAuthRoutes(database);
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      const response = await this.apiAuthRoutes.handle(req, url);
      if (response) return response;
    }

    // Web routes (to be implemented in Phase 2)
    // if (url.pathname.startsWith('/')) {
    //   const response = await this.webRoutes.handle(req, url);
    //   if (response) return response;
    // }

    // 404 for unmatched routes
    return errorResponse("Not Found", 404);
  }
}