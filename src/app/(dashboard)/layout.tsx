import Link from "next/link";
import { auth, signOut } from "@/server/auth";
import { APP_NAME } from "@/config/app";
import { Button } from "@/components/ui/button";
import { ConnectionIndicator } from "@/components/shared/connection-indicator";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/documents" className="font-semibold tracking-tight">
              {APP_NAME}
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
              <Link href="/documents" className="hover:text-foreground">
                Documents
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                Settings
              </Link>
              <Link href="/profile" className="hover:text-foreground">
                Profile
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionIndicator />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session?.user?.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
        {children}
      </div>
    </div>
  );
}
