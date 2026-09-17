import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Same-origin proxy to the backend, so exposing this dev server through a tunnel (devtunnels,
// ngrok, cloudflared, anything) never requires forwarding a second port for the API — the
// browser only ever talks to this origin, and this process forwards /__api__/* to the backend
// running alongside it (default: localhost:8090, override with BACKEND_URL).
const PROXY_PREFIX = "/__api__";
const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://localhost:8090";

async function proxyToBackend(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = `${BACKEND_URL}${url.pathname.slice(PROXY_PREFIX.length)}${url.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  // Node's fetch transparently decompresses a gzip response body but leaves the
  // `content-encoding: gzip` response header as-is — forwarding that header alongside the
  // already-decompressed bytes makes the browser try to gzip-decode plain JSON and fail.
  // Asking the backend not to compress in the first place sidesteps that entirely.
  headers.set("accept-encoding", "identity");
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    // @ts-expect-error Node's fetch requires this for streaming request bodies (PATCH/PUT with a body).
    duplex: "half",
  });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(PROXY_PREFIX)) {
      try {
        return await proxyToBackend(request);
      } catch (error) {
        console.error("API proxy failed:", error);
        return new Response(JSON.stringify({ success: false, message: "Backend unreachable" }), {
          status: 502,
          headers: { "content-type": "application/json" },
        });
      }
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
