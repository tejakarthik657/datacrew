/**
 * BFF Session Routes
 * POST /api/session          → login (sets httpOnly cookie)
 * POST /api/session/register → register (sets httpOnly cookie)
 * DELETE /api/session        → logout (clears cookie)
 *
 * The JWT never touches localStorage — only httpOnly, SameSite=Lax, Secure cookies.
 */

import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "https://datacrew-h98o.onrender.com";

const COOKIE_NAME = "dc_jwt";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // 7 days
  maxAge: 60 * 60 * 24 * 7,
};

/** POST /api/session — login / register / google */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "login";

  let endpoint = "/auth/login";
  let fetchBody: unknown = { email: body.email, password: body.password };

  if (action === "register") {
    endpoint = "/auth/register";
    fetchBody = { email: body.email, password: body.password, workspace_name: body.workspace_name };
  } else if (action === "google") {
    endpoint = "/auth/google";
    fetchBody = { code: body.code, credential: body.credential, redirect_uri: body.redirect_uri };
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fetchBody),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { code: data.code ?? "AUTH_ERROR", message: data.message ?? "Authentication failed", hint: data.hint },
      { status: res.status },
    );
  }

  const token: string = data.token ?? data.access_token;
  if (!token) {
    return NextResponse.json(
      { code: "NO_TOKEN", message: "No token in response" },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true, email: data.email ?? body.email });
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return response;
}

/** DELETE /api/session — logout */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

/** GET /api/session — check session (returns user info from /auth/me) */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
    return response;
  }

  const me = await res.json();
  return NextResponse.json({ authenticated: true, user: me });
}
