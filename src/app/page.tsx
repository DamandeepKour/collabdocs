import Link from "next/link";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { AUTHOR } from "@/config/author";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    title: "Local-first",
    body: "IndexedDB is the source of truth. Open, edit, and close with zero network blocking.",
  },
  {
    title: "Background sync",
    body: "Queued pushes with backoff and version conflicts that never wipe offline work.",
  },
  {
    title: "Version history",
    body: "Snapshots, timeline, compare, and safe restore as a new version bump.",
  },
  {
    title: "RBAC",
    body: "Owner, Editor, Viewer — viewers cannot push sync or edit state.",
  },
  {
    title: "AI add-ons",
    body: "Summarize, rewrite, grammar, continue, tags, chat — powered by Groq / AI SDK.",
  },
  {
    title: "Production-minded",
    body: "Zod validation, payload limits, rate limits, security headers, CI + Vercel.",
  },
];

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_oklch(0.92_0.02_250)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_oklch(0.94_0.03_160)_0%,_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.25_0.04_250)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_oklch(0.22_0.03_160)_0%,_transparent_45%)]"
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold tracking-tight">{APP_NAME}</div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Assignment ready</Badge>
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 pb-16 pt-4">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {APP_NAME}
          </h1>
          <p className="text-lg text-muted-foreground">{APP_DESCRIPTION}</p>
          <p className="text-sm text-muted-foreground">
            Built by{" "}
            <span className="font-medium text-foreground">{AUTHOR.name}</span>
            . See the footer for GitHub and LinkedIn.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="max-w-3xl border-border/70">
          <CardHeader>
            <CardTitle>Stack</CardTitle>
            <CardDescription>
              Next.js 16 · React · TypeScript · Tailwind/shadcn · PostgreSQL ·
              Auth.js · AI SDK (Groq)
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Docs: <code className="text-xs">docs/security.md</code>,{" "}
            <code className="text-xs">docs/DEPLOY.md</code>,{" "}
            <code className="text-xs">docs/architecture.md</code>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
