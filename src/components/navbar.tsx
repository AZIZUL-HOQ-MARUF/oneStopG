"use client";

import { useTheme } from "@/components/theme-provider";
import { signOut } from "next-auth/react";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sun, Moon, Menu, LogOut, User } from "lucide-react";

export default function Navbar({
  onMenuOpen,
}: {
  onMenuOpen?: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const { primaryEmail } = useAccounts();

  const initials = primaryEmail
    ? primaryEmail
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <button
        onClick={onMenuOpen}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm truncate">{primaryEmail ?? "User"}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
