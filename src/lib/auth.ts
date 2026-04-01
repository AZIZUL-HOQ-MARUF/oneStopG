import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

const DRIVE_SCOPE =
  "openid email profile https://www.googleapis.com/auth/drive";

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.error || "Token refresh failed");
    }

    // Update connected accounts with refreshed primary token
    const accounts = (token.connectedAccounts as ConnectedAccountJWT[]) || [];
    const primaryEmail = token.email as string;
    const updated = accounts.map((a) =>
      a.email === primaryEmail
        ? {
            ...a,
            accessToken: data.access_token,
            expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
          }
        : a
    );

    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
      refreshToken: data.refresh_token ?? token.refreshToken,
      connectedAccounts: updated,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return { ...token, error: "RefreshTokenError" };
  }
}

interface ConnectedAccountJWT {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  storageQuota: { used: number; limit: number; free: number };
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: DRIVE_SCOPE,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/setup",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: store tokens from Google
      if (account) {
        const newAccount: ConnectedAccountJWT = {
          email: token.email as string,
          accessToken: account.access_token as string,
          refreshToken: account.refresh_token as string,
          expiresAt: account.expires_at as number,
          storageQuota: { used: 0, limit: 15 * 1024 ** 3, free: 15 * 1024 ** 3 },
        };

        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.connectedAccounts = [newAccount];
        return token;
      }

      // Return token if it hasn't expired yet (5min buffer)
      const expiresAt = (token.expiresAt as number) || 0;
      if (Date.now() < (expiresAt - 5 * 60) * 1000) {
        return token;
      }

      // Token expired — refresh it
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
        connectedAccounts:
          (token.connectedAccounts as ConnectedAccountJWT[]) || [],
      };
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
