"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAccounts } from "@/hooks/useAccounts";
import { useStorage } from "@/hooks/useStorage";
import { formatBytes } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Settings as SettingsIcon, Mail } from "lucide-react";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { accounts, primaryEmail } = useAccounts();
  const { quotas, refreshStorage } = useStorage();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "account_connected") {
      toast.success("Account connected successfully");
      refreshStorage();
    }
    if (error) {
      toast.error("Failed to connect account", { description: error });
    }
  }, [searchParams, refreshStorage]);

  const handleConnectAccount = () => {
    window.location.href = "/api/drive/connect";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage connected accounts and preferences
        </p>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Connected Accounts
              </CardTitle>
              <CardDescription>
                {accounts.length} Google Drive account
                {accounts.length !== 1 ? "s" : ""} connected
              </CardDescription>
            </div>
            <Button onClick={handleConnectAccount}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map((account) => {
            const quota = quotas.find((q) => q.email === account.email);
            const used = quota?.used ?? account.storageQuota.used;
            const limit = quota?.limit ?? account.storageQuota.limit;
            const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;

            return (
              <div
                key={account.email}
                className="rounded-lg border border-border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{account.email}</p>
                      {account.email === primaryEmail && (
                        <Badge variant="secondary" className="text-[10px] mt-0.5">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatBytes(used)} used</span>
                    <span>{formatBytes(limit)} total</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            OneStopG aggregates multiple Google Drive accounts into a single
            unified dashboard. Your data stays in your Google Drive accounts —
            only access tokens are stored in your browser session.
          </p>
          <Separator />
          <p>
            Session is valid for 30 days. Tokens are automatically refreshed —
            you should not need to re-authenticate unless you revoke access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
