import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handlePhotoRequest } from "./photo-analysis.mjs";

const built = process.argv.includes("--built");
const root = await realpath(fileURLToPath(new URL(built ? "../dist/" : "../ui/", import.meta.url)));
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex < 0 ? process.env.PORT || 5173 : process.argv[portIndex + 1]);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid port.");
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".glb": "model/gltf-binary", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain; charset=utf-8",
};

function insideRoot(path, directory = root) {
  const name = relative(directory, path);
  return !isAbsolute(name) && name !== ".." && !name.startsWith(`..${sep}`);
}

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-cache");
  const url = new URL(request.url, "http://localhost");
  // SCOPE photo check (Gemini) is answered here; the API key never reaches the browser.
  if (url.pathname.startsWith("/api/scope/") && await handlePhotoRequest(request, response, url.pathname)) return;
  if (url.pathname.startsWith("/api/")) {
    const upstream = httpsRequest(`https://localhost:8443${url.pathname}${url.search}`, {
      method: request.method, headers: { ...request.headers, host: "localhost:8443" },
      rejectUnauthorized: false, timeout: 8000,
    }, (result) => {
      response.writeHead(result.statusCode, result.headers);
      result.pipe(response);
    });
    upstream.on("timeout", () => upstream.destroy());
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Local API unavailable. Start npm run server for live services." }));
    });
    request.pipe(upstream);
    return;
  }
  try {
    const voice = url.pathname === "/voice" || url.pathname.startsWith("/voice/");
    const directory = !built && voice ? fileURLToPath(new URL("../dist/", import.meta.url)) : root;
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let file = resolve(directory, `.${decodeURIComponent(url.pathname)}`);
    if (!insideRoot(file, directory)) { response.writeHead(403).end(); return; }
    try {
      if ((await stat(file)).isDirectory()) {
        if (!url.pathname.endsWith("/")) {
          response.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
          return;
        }
        file = resolve(file, "index.html");
      }
      file = await realpath(file);
    } catch (error) {
      if (!voice || extname(url.pathname)) throw error;
      file = resolve(directory, "voice/index.html");
    }
    if (!insideRoot(file, directory)) { response.writeHead(403).end(); return; }
    const info = await stat(file);
    const type = types[extname(file)] || "application/octet-stream";
    // Byte ranges let Safari (and iPad) play and seek MP4 video.
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || "");
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(info.size - 1, Number(range[2])) : info.size - 1;
      if (!(start >= 0 && start < info.size && end >= start)) {
        response.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
        return;
      }
      response.writeHead(206, { "Content-Type": type, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Accept-Ranges": "bytes" });
      if (request.method === "HEAD") response.end();
      else createReadStream(file, { start, end }).on("error", () => response.destroy()).pipe(response);
      return;
    }
    response.writeHead(200, { "Content-Type": type, "Content-Length": info.size, "Accept-Ranges": "bytes" });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).on("error", () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => console.log(`ORBIT UI: http://localhost:${server.address().port}/`));
