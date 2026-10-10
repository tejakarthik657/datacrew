/**
 * BFF Proxy — catch-all forwarding to FastAPI
 * /api/proxy/[...path] → ${API_URL}/[...path]
 *
 * Reads the JWT from the httpOnly cookie and adds Authorization: Bearer header.
 * Streams download responses without buffering.
 */

import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const COOKIE_NAME = "dc_jwt";

type Params = { path: string[] };

async function handler(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { path } = await params;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // Build upstream URL
  const upstreamPath = "/" + path.join("/");
  const search = req.nextUrl.search;
  const upstreamUrl = `${API_URL}${upstreamPath}${search}`;

  // Forward headers (minus Next-internal ones)
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "connection" ||
      lower.startsWith("x-middleware") ||
      lower.startsWith("x-nextjs") ||
      lower === "cookie"
    ) {
      return;
    }
    forwardHeaders.set(key, value);
  });

  if (token) {
    forwardHeaders.set("Authorization", `Bearer ${token}`);
  }

  // Forward the body for non-GET/HEAD requests
  let body: BodyInit | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer().then((b) => (b.byteLength > 0 ? b : null));
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      // Do not follow redirects — pass them through
      redirect: "manual",
      // @ts-expect-error — Node 18+ supports this
      duplex: "half",
    });
  } catch (err) {
    console.error("[proxy] fetch error:", err);
    return NextResponse.json(
      { code: "PROXY_ERROR", message: "Could not reach API", hint: String(err) },
      { status: 502 },
    );
  }

  // Add request_id to all error responses
  const requestId = upstream.headers.get("x-request-id") ?? undefined;

  // For streaming downloads, pass through the body as a stream
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "transfer-encoding" || lower === "connection") return;
    responseHeaders.set(key, value);
  });
  if (requestId) responseHeaders.set("x-request-id", requestId);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
