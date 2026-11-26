'use strict';

/**
 * Minimal, dependency-free static file server used to serve the game.
 *
 * The game is a web application that uses:
 *  - Web Workers        (new Worker("simulation_worker.bundle.js"))
 *  - WebAssembly        (polytrack_physics.wasm)
 *  - fetch() for assets (models, tracks, ...)
 *  - IndexedDB / localStorage for saves
 *
 * Loading it from file:// would break several of these, so we serve it from
 * http://127.0.0.1:<fixed port>/. A fixed port is important: localStorage and
 * IndexedDB are scoped by origin (scheme + host + port), so a changing port
 * would make the player lose their saves on every launch.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.track': 'application/octet-stream'
};

function contentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/**
 * Create the HTTP server for a given root directory.
 * @param {string} root Absolute path of the directory to serve.
 * @returns {http.Server}
 */
function createStaticServer(root) {
  const rootResolved = path.resolve(root);

  return http.createServer((req, res) => {
    // Only GET / HEAD are meaningful for a static server.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method Not Allowed');
      return;
    }

    let pathname;
    try {
      const requestUrl = new URL(req.url, 'http://127.0.0.1');
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    if (pathname === '/' || pathname === '') pathname = '/index.html';

    // Resolve inside the root and refuse anything that escapes it.
    const filePath = path.resolve(path.join(rootResolved, pathname));
    if (filePath !== rootResolved && !filePath.startsWith(rootResolved + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      const headers = {
        'Content-Type': contentType(filePath),
        'Cache-Control': 'no-cache',
        'Accept-Ranges': 'bytes'
      };

      // Range support keeps <audio>/<video> seeking and streaming happy.
      const range = req.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        if (match) {
          let start = match[1] === '' ? null : Number(match[1]);
          let end = match[2] === '' ? null : Number(match[2]);

          if (start === null && end !== null) {
            // Suffix range: last N bytes.
            start = Math.max(0, stats.size - end);
            end = stats.size - 1;
          } else {
            if (start === null) start = 0;
            if (end === null || end >= stats.size) end = stats.size - 1;
          }

          if (start > end || start >= stats.size) {
            res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
            res.end();
            return;
          }

          headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
          headers['Content-Length'] = end - start + 1;
          res.writeHead(206, headers);
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          fs.createReadStream(filePath, { start, end }).pipe(res);
          return;
        }
      }

      headers['Content-Length'] = stats.size;
      res.writeHead(200, headers);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    });
  });
}

/**
 * Start the static server on the first available port of a stable range.
 * @param {string} root Directory to serve.
 * @param {number} [preferredPort] First port to try.
 * @returns {Promise<{server: http.Server, port: number, url: string}>}
 */
function startStaticServer(root, preferredPort = 47821) {
  const server = createStaticServer(root);

  return new Promise((resolve, reject) => {
    let port = preferredPort;
    const maxPort = preferredPort + 30;

    const tryListen = () => {
      const onError = (error) => {
        server.removeListener('listening', onListening);
        if (error.code === 'EADDRINUSE' && port < maxPort) {
          port += 1;
          tryListen();
          return;
        }
        reject(error);
      };

      const onListening = () => {
        server.removeListener('error', onError);
        resolve({
          server,
          port,
          url: `http://127.0.0.1:${port}/`
        });
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, '127.0.0.1');
    };

    tryListen();
  });
}

module.exports = { createStaticServer, startStaticServer, MIME_TYPES };
