import Link from "next/link";
import { AUTHOR } from "@/config/author";
import { APP_NAME } from "@/config/app";

/**
 * Required submission footer: name, GitHub, LinkedIn.
 */
export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-border/70 bg-muted/30"
      role="contentinfo"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            {APP_NAME} · built by {AUTHOR.name}
          </p>
          <p className="text-muted-foreground">
            Local-first collaborative documents · Next.js 16 · PostgreSQL · Groq
          </p>
        </div>
        <nav
          aria-label="Author profiles"
          className="flex flex-wrap items-center gap-4 text-sm"
        >
          <Link
            href={AUTHOR.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            GitHub Profile
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
          <Link
            href={AUTHOR.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            LinkedIn Profile
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
          <a
            href={`mailto:${AUTHOR.email}`}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {AUTHOR.email}
          </a>
        </nav>
      </div>
    </footer>
  );
}
