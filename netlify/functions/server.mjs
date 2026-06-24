import server from "./server-dist/server.js";

export default async (request) => {
  return server.fetch(request, {}, {});
};

export const config = {
  path: "/*",
};
