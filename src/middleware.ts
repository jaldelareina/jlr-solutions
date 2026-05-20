import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  // Para APIs, no cachear
  if (context.url.pathname.startsWith('/api/')) {
    context.response = new Response(context.request);
    context.response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  return next();
});
