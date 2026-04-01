import "next-auth";
import type { SessionAccount } from "@/types";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    error?: string;
    connectedAccounts: SessionAccount[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
    connectedAccounts?: SessionAccount[];
  }
}
