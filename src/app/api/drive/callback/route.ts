import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encode, decode } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=missing_params", request.url)
    );
  }

  // Validate CSRF state
  const storedState = request.cookies.get("drive_oauth_state")?.value;
  if (state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=invalid_state", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/drive/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Get user email
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const userInfo = await userInfoResponse.json();
    if (!userInfo.email) {
      throw new Error("Google did not return an email address");
    }

    // Get storage quota
    let storageQuota = { used: 0, limit: 15 * 1024 ** 3, free: 15 * 1024 ** 3 };
    try {
      const quotaResponse = await fetch(
        "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      if (quotaResponse.ok) {
        const quotaData = await quotaResponse.json();
        const used = parseInt(quotaData.storageQuota?.usage ?? "0", 10);
        const limit = parseInt(
          quotaData.storageQuota?.limit ?? String(15 * 1024 ** 3),
          10
        );
        storageQuota = { used, limit, free: Math.max(0, limit - used) };
      }
    } catch {
      // Use default quota if fetch fails
    }

    // Update the JWT with the new connected account
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      throw new Error("No session token found");
    }

    const jwt = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
      salt:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
    });

    if (!jwt) {
      throw new Error("Failed to decode session");
    }

    const connectedAccounts = (jwt.connectedAccounts as Array<{
      email: string;
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      storageQuota: { used: number; limit: number; free: number };
    }>) || [];

    const newAccount = {
      email: userInfo.email,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
      storageQuota,
    };

    // Replace if same email, otherwise add
    const existingIndex = connectedAccounts.findIndex(
      (a) => a.email === userInfo.email
    );
    if (existingIndex >= 0) {
      connectedAccounts[existingIndex] = newAccount;
    } else {
      connectedAccounts.push(newAccount);
    }

    jwt.connectedAccounts = connectedAccounts;

    const newToken = await encode({
      token: jwt,
      secret: process.env.NEXTAUTH_SECRET!,
      salt:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/settings?success=account_connected", request.url)
    );

    // Set the updated session cookie
    response.cookies.set(
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      newToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      }
    );

    // Clear the CSRF state cookie
    response.cookies.delete("drive_oauth_state");

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect account";
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?error=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }
}
