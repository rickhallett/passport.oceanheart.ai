import type { ApiResponse } from "../types/requests";

export function jsonResponse<T = any>(
  data?: T,
  status: number = 200,
  headers?: HeadersInit
): Response {
  const body: ApiResponse<T> = {
    success: status >= 200 && status < 300,
    data
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function errorResponse(
  error: string,
  status: number = 400,
  headers?: HeadersInit
): Response {
  const body: ApiResponse = {
    success: false,
    error
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function successResponse<T = any>(
  data?: T,
  message?: string,
  status: number = 200,
  headers?: HeadersInit
): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    message
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function htmlResponse(html: string, status: number = 200, headers?: HeadersInit): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers
    }
  });
}

export function redirectResponse(url: string, status: number = 302): Response {
  return new Response(null, {
    status,
    headers: {
      'Location': url
    }
  });
}