import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";

const port = Number(process.env.S3_API_PORT || 9000);
const bucketName = process.env.S3_BUCKET_NAME || "uploads";
const root = resolve("runtime/local-s3");
const bucketRoot = join(root, bucketName);

const contentTypes = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".json", "application/json"],
  [".md", "text/markdown; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
]);

function send(res, status, body = "", headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Content-Length": payload.length,
    ...headers,
  });
  if (res.req.method === "HEAD") {
    res.end();
  } else {
    res.end(payload);
  }
}

function xmlError(code, message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`;
}

function parsePath(req) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const parts = decodeURIComponent(url.pathname).split("/").filter(Boolean);
  const bucket = parts.shift();
  const key = parts.join("/");
  return { bucket, key, url };
}

function safeObjectPath(key) {
  const candidate = resolve(bucketRoot, normalize(key));
  if (!candidate.startsWith(bucketRoot)) {
    throw new Error("Invalid object key");
  }
  return candidate;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

await mkdir(bucketRoot, { recursive: true });

const server = createServer(async (req, res) => {
  res.req = req;

  if (req.method === "OPTIONS") {
    send(res, 204);
    return;
  }

  const { bucket, key } = parsePath(req);
  if (!bucket || bucket !== bucketName) {
    send(res, 404, xmlError("NoSuchBucket", "Bucket not found"), {
      "Content-Type": "application/xml",
    });
    return;
  }

  if (!key) {
    if (req.method === "GET" || req.method === "HEAD") {
      send(res, 200, "", { "Content-Type": "application/xml" });
      return;
    }
    send(res, 405, xmlError("MethodNotAllowed", "Bucket operation not supported"), {
      "Content-Type": "application/xml",
    });
    return;
  }

  try {
    const objectPath = safeObjectPath(key);

    if (req.method === "PUT") {
      const body = await readBody(req);
      await mkdir(dirname(objectPath), { recursive: true });
      await writeFile(objectPath, body);
      send(res, 200, "", { ETag: `"${Buffer.byteLength(body).toString(16)}"` });
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      const fileStat = await stat(objectPath);
      const contentType =
        contentTypes.get(extname(objectPath).toLowerCase()) || "application/octet-stream";

      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Content-Length": fileStat.size,
        "Content-Type": contentType,
      });
      if (req.method === "HEAD") {
        res.end();
      } else {
        createReadStream(objectPath).pipe(res);
      }
      return;
    }

    if (req.method === "DELETE") {
      await rm(objectPath, { force: true });
      send(res, 204);
      return;
    }

    if (req.method === "POST") {
      send(res, 501, xmlError("NotImplemented", "Multipart uploads are not supported locally"), {
        "Content-Type": "application/xml",
      });
      return;
    }

    send(res, 405, xmlError("MethodNotAllowed", "Method not allowed"), {
      "Content-Type": "application/xml",
    });
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 500;
    send(res, status, xmlError(status === 404 ? "NoSuchKey" : "InternalError", error.message), {
      "Content-Type": "application/xml",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local S3 server ready at http://localhost:${port}/${bucketName}`);
  console.log(`Objects are stored in ${bucketRoot}`);
});
