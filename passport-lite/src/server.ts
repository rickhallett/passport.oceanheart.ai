import { serve } from "bun";
import { Router } from "./routes/router";
import { DatabaseService } from "./config/database";
import { runMigrations } from "../migrations/migrate";

const router = new Router();
const db = new DatabaseService();

// Run migrations on startup
await runMigrations();

const server = serve({
  port: Bun.env.PORT || 3000,
  
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    // Static file serving
    if (url.pathname.startsWith('/public/')) {
      const filePath = `./public${url.pathname.slice(7)}`;
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            'Cache-Control': 'public, max-age=31536000'
          }
        });
      }
    }
    
    // Health check endpoint
    if (url.pathname === '/up') {
      return new Response('OK', { status: 200 });
    }
    
    // Route handling
    try {
      return await router.handle(req, db);
    } catch (error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  
  error(error: Error): Response {
    console.error('Unhandled error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`🚀 Passport Lite server running at http://localhost:${server.port}`);