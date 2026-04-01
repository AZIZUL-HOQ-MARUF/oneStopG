import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encode, decode } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "No session token" }, { status: 401 });
  }

  const salt =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

  const jwt = await decode({
    token: sessionToken,
    secret: process.env.NEXTAUTH_SECRET!,
    salt,
  });

  if (!jwt) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const connectedAccounts = (jwt.connectedAccounts as Array<{
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    storageQuota: { used: number; limit: number; free: number };
  }>) || [];

  const account = connectedAccounts.find((a) => a.email === email);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Check if token is still valid (5 min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (now < account.expiresAt - 300) {
    return NextResponse.json({
      accessToken: account.accessToken,
      expiresAt: account.expiresAt,
      email: account.email,
    });
  }

  // Token expired — refresh it
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error_description || "Token refresh failed", stale: true },
        { status: 401 }
      );
    }

    // Update the account in the JWT
    const newExpiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
    account.accessToken = data.access_token;
    account.expiresAt = newExpiresAt;
    if (data.refresh_token) {
      account.refreshToken = data.refresh_token;
    }

    // Also update the primary token if this is the primary account
    if (jwt.email === email) {
      jwt.accessToken = data.access_token;
      jwt.expiresAt = newExpiresAt;
      if (data.refresh_token) {
        jwt.refreshToken = data.refresh_token;
      }
    }

    jwt.connectedAccounts = connectedAccounts;

    const newToken = await encode({
      token: jwt,
      secret: process.env.NEXTAUTH_SECRET!,
      salt,
    });

    const res = NextResponse.json({
      accessToken: data.access_token,
      expiresAt: newExpiresAt,
      email: account.email,
    });

    res.cookies.set(salt, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Token refresh failed", stale: true },
      { status: 500 }
    );
  }
}
