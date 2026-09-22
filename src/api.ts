// src/api.ts

// Dynamically picks the Vercel/Render production URL, or defaults to local dev
export const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://smartqueue-server.onrender.com'
    : 'http://localhost:3000';
// Optional helper function to make fetch calls simpler across components
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}