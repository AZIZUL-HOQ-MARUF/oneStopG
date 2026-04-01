"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  HardDrive,
  Zap,
  FolderOpen,
  Trash2,
  BarChart3,
  Shield,
  Share2,
  Code,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: HardDrive,
    bg: "bg-orange-100 dark:bg-orange-950/50",
    color: "text-orange-500 dark:text-orange-400",
    title: "Unified Storage Pool",
    desc: "Combine unlimited Google Drive accounts into one dashboard. N accounts × 15 GB = effectively unlimited free cloud storage.",
  },
  {
    icon: Zap,
    bg: "bg-amber-100 dark:bg-amber-950/50",
    color: "text-amber-500 dark:text-amber-400",
    title: "Smart Upload Routing",
    desc: "Least-Used-Space strategy automatically routes every upload to the account with the most free space.",
  },
  {
    icon: FolderOpen,
    bg: "bg-sky-100 dark:bg-sky-950/50",
    color: "text-sky-500 dark:text-sky-400",
    title: "Folder Navigation",
    desc: "Full folder hierarchy with breadcrumb bar, grid & list views, search, and file type filters across all accounts.",
  },
  {
    icon: Share2,
    bg: "bg-violet-100 dark:bg-violet-950/50",
    color: "text-violet-500 dark:text-violet-400",
    title: "Shared with Me",
    desc: "Browse files and folders that others have shared with your Drive accounts.",
  },
  {
    icon: Trash2,
    bg: "bg-rose-100 dark:bg-rose-950/50",
    color: "text-rose-500 dark:text-rose-400",
    title: "Trash Management",
    desc: "Delete sends files to Drive trash. Restore any file or permanently delete from the Trash page.",
  },
  {
    icon: BarChart3,
    bg: "bg-emerald-100 dark:bg-emerald-950/50",
    color: "text-emerald-500 dark:text-emerald-400",
    title: "Rich Analytics",
    desc: "Storage breakdown per account, file type distribution, weekly upload activity — all client-side.",
  },
  {
    icon: Shield,
    bg: "bg-teal-100 dark:bg-teal-950/50",
    color: "text-teal-500 dark:text-teal-400",
    title: "Persistent Sessions",
    desc: "Sign in once and stay logged in for 30 days. Server-side token refresh means no popups or daily re-auth.",
  },
  {
    icon: Code,
    bg: "bg-pink-100 dark:bg-pink-950/50",
    color: "text-pink-500 dark:text-pink-400",
    title: "Open Source",
    desc: "100% free and open source. Privacy-first — your data stays in your own Google Drive accounts.",
  },
];

const pages = [
  {
    label: "Overview",
    accent: "from-blue-500 to-violet-500",
    desc: "Stats cards, per-account storage bars, file type breakdown, and recent files at a glance.",
  },
  {
    label: "Files",
    accent: "from-emerald-500 to-teal-500",
    desc: "Upload, browse, rename, move, download, and trash files across all accounts.",
  },
  {
    label: "Shared with Me",
    accent: "from-violet-500 to-purple-500",
    desc: "Browse files and folders that other people have shared with your Drive accounts.",
  },
  {
    label: "Trash",
    accent: "from-rose-500 to-orange-500",
    desc: "See all trashed files, restore them to Drive, or permanently delete them.",
  },
  {
    label: "Analytics",
    accent: "from-amber-500 to-yellow-500",
    desc: "Weekly upload activity, storage by account, file type distribution.",
  },
  {
    label: "Settings",
    accent: "from-sky-500 to-cyan-500",
    desc: "Connect or disconnect Drive accounts, view quotas, and manage preferences.",
  },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const { theme, setTheme, mounted } = useTheme();

  const ctaHref = session ? "/dashboard" : "/setup";
  const ctaLabel = session ? "Go to Dashboard" : "Get Started";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-violet-600">
              <Cloud className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">OneStopG</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8"
            >
              {!mounted ? (
                <span className="h-4 w-4" />
              ) : theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button render={<Link href={ctaHref} />}>
              {ctaLabel}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Welcome back banner */}
      {session && (
        <section className="border-b border-border/50 bg-linear-to-r from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left sm:px-6">
            <div>
              <h2 className="text-lg font-semibold">Welcome back</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {session.user?.email}
              </p>
            </div>
            <Button render={<Link href="/dashboard" />}>
              Go to Dashboard
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 h-125 w-125 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
          <div className="absolute -top-20 right-1/4 h-100 w-100 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/10" />
          <div className="absolute top-40 left-1/2 h-75 w-75 -translate-x-1/2 rounded-full bg-indigo-400/8 blur-3xl dark:bg-indigo-500/8" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-24 text-center md:py-36">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 dark:border-blue-800 dark:bg-blue-950/50">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Open Source · Free Forever · Persistent Auth
            </span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Your Storage,{" "}
            <span className="bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-400 dark:to-purple-400">
              Multiplied
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            OneStopG aggregates multiple Google Drive accounts into a single
            unified dashboard. Get up to{" "}
            <strong className="text-foreground">N × 15 GB</strong> free cloud
            storage with smart routing, folder navigation, trash management, and
            rich analytics — all with persistent auth that never asks you to
            re-login.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-linear-to-r from-blue-600 to-violet-600 px-6 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 dark:shadow-blue-500/15 dark:hover:shadow-blue-500/30"
              render={<Link href={ctaHref} />}
            >
              {ctaLabel}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: "Free Storage per Account", value: "15 GB", color: "text-blue-600 dark:text-blue-400" },
              { label: "Max Accounts", value: "Unlimited", color: "text-violet-600 dark:text-violet-400" },
              { label: "Session Duration", value: "30 Days", color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Cost", value: "$0", color: "text-amber-600 dark:text-amber-400" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
              >
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Everything you need,{" "}
              <span className="bg-linear-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-violet-400">
                nothing you don&apos;t
              </span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              A focused set of features built for power users who want more from
              their free cloud storage.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`mb-4 inline-flex rounded-xl ${f.bg} p-2.5`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Pages Showcase */}
      <section className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Six dedicated views,{" "}
              <span className="bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
                one coherent app
              </span>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <div
                key={page.label}
                className="group rounded-2xl border border-border/50 bg-card p-5 transition-all hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`mb-3 inline-flex rounded-lg bg-linear-to-r ${page.accent} px-3 py-1 text-xs font-semibold text-white`}>
                  {page.label}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {page.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50">
        <div className="relative overflow-hidden py-20">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute bottom-0 left-1/3 h-75 w-75 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
            <div className="absolute bottom-0 right-1/3 h-62.5 w-62.5 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/10" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Get started in{" "}
              <span className="bg-linear-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-violet-400">
                minutes
              </span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Sign in with Google, connect your accounts, and start managing your
              storage — all in one place.
            </p>
            <div className="mt-8">
              <Button
                size="lg"
                className="bg-linear-to-r from-blue-600 to-violet-600 px-6 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 dark:shadow-blue-500/15 dark:hover:shadow-blue-500/30"
                render={<Link href={ctaHref} />}
              >
                {ctaLabel}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-br from-blue-500 to-violet-600">
              <Cloud className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              OneStopG
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Free &amp; open source
          </p>
        </div>
      </footer>
    </div>
  );
}
