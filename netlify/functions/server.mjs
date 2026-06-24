import server from "./server-dist/server.js";

export default async (request) => {
  return server.fetch(request, {}, {});
};

export const config = {
  path: "/*",
  // Let the CDN serve built static assets directly. A function's in-code
  // `path` config outranks netlify.toml redirects AND static files, so
  // without these exclusions the SSR function swallows /assets/* requests
  // and returns its HTML 404 page (breaking JS/CSS MIME types).
  excludedPath: ["/assets/*", "/images/*"],
};
