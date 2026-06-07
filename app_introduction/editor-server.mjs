import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(rootDir, "remotion-deck", "deck.config.json");
const deckDataPath = path.join(rootDir, "remotion-deck", "src", "deckData.ts");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 5222);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
]);

const readBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
};

const validateDeckConfig = (candidate) => {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Deck config must be an object.");
  }

  if (!Array.isArray(candidate.slides)) {
    throw new Error("Deck config must include a slides array.");
  }

  if (candidate.slides.length === 0) {
    throw new Error("At least one slide is required.");
  }

  for (const [index, slide] of candidate.slides.entries()) {
    if (!slide || typeof slide !== "object") {
      throw new Error(`Slide ${index + 1} must be an object.`);
    }

    for (const key of ["kicker", "title", "subtitle", "layout"]) {
      if (typeof slide[key] !== "string") {
        throw new Error(`Slide ${index + 1} is missing string field '${key}'.`);
      }
    }
  }

  return {
    version: Number.isFinite(candidate.version) ? candidate.version : 1,
    slides: candidate.slides,
  };
};

const generateDeckData = (slides) => `export type DeckCard = {
  label: string;
  title: string;
  body: string;
  tone: "red" | "blue" | "green" | "violet" | "amber";
};

export type DeckFlowStep = {
  title: string;
  body: string;
};

export type DeckRow = {
  key: string;
  value: string;
  note: string;
};

export type DeckRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DeckCanvas = {
  title?: DeckRect;
  subtitle?: DeckRect;
  content?: DeckRect;
  heroContent?: DeckRect;
};

export type DeckSlide = {
  kicker: string;
  title: string;
  subtitle: string;
  layout: "hero" | "cards" | "flow" | "architecture" | "hosting" | "table" | "closing";
  cards?: DeckCard[];
  flow?: DeckFlowStep[];
  rows?: DeckRow[];
  code?: string[];
  note?: string;
  canvas?: DeckCanvas;
};

export const deckSlides: DeckSlide[] = ${JSON.stringify(slides, null, 2)};
`;

const saveDeckConfig = async (config) => {
  const normalized = validateDeckConfig(config);
  const json = `${JSON.stringify(normalized, null, 2)}\n`;
  await writeFile(configPath, json, "utf8");
  await writeFile(deckDataPath, generateDeckData(normalized.slides), "utf8");

  return normalized;
};

const serveStatic = async (request, response, url) => {
  const requestedPath =
    url.pathname === "/" ? "/editor.html" : decodeURIComponent(url.pathname);
  const candidatePath = path.resolve(rootDir, `.${requestedPath}`);

  if (!candidatePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(candidatePath);
    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(candidatePath).toLowerCase();
    response.writeHead(200, {
      "content-type":
        contentTypes.get(extension) || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(await readFile(candidatePath));
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  try {
    if (url.pathname === "/favicon.ico") {
      response.writeHead(204, { "cache-control": "no-store" });
      response.end();
      return;
    }

    if (url.pathname === "/api/deck-config" && request.method === "GET") {
      const raw = await readFile(configPath, "utf8");
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(raw);
      return;
    }

    if (url.pathname === "/api/deck-config" && request.method === "POST") {
      const raw = await readBody(request);
      const parsed = JSON.parse(raw);
      const saved = await saveDeckConfig(parsed);
      sendJson(response, 200, {
        ok: true,
        savedAt: new Date().toISOString(),
        slides: saved.slides.length,
      });
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(request, response, url);
      return;
    }

    response.writeHead(405, { allow: "GET, HEAD, POST" });
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Vibe Vote Arena deck editor: http://${host}:${port}/editor.html`);
  console.log(`Saving to ${path.relative(process.cwd(), configPath)}`);
});
