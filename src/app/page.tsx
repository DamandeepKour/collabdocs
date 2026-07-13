import Link from "next/link";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PHASES = [
  { phase: 1, label: "Project setup", status: "done" as const },
  { phase: 2, label: "Auth & RBAC", status: "done" as const },
  { phase: 3, label: "Document CRUD", status: "done" as const },
  { phase: 4, label: "Offline engine", status: "done" as const },
  { phase: 5, label: "Sync engine", status: "done" as const },
  { phase: 6, label: "Realtime collaboration", status: "done" as const },
  { phase: 7, label: "Version history", status: "done" as const },
  { phase: 8, label: "AI features", status: "done" as const },
  { phase: 9, label: "Performance", status: "done" as const },
  { phase: 10, label: "Testing", status: "done" as const },
  { phase: 11, label: "Deployment", status: "pending" as const },
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
          <Badge variant="secondary">Phases 1–10 complete</Badge>
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
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <Card id="roadmap" className="max-w-3xl">
          <CardHeader>
            <CardTitle>Implementation roadmap</CardTitle>
            <CardDescription>
              Core product phases are implemented. Deployment config is optional Phase 11.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {PHASES.map((item) => (
                <li
                  key={item.phase}
                  className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">Phase {item.phase}</span>
                    <span className="text-muted-foreground"> — {item.label}</span>
                  </span>
                  <Badge variant={item.status === "done" ? "default" : "outline"}>
                    {item.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
