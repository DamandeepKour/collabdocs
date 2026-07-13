import { auth } from "@/server/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {session?.user?.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {session?.user?.email ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">User ID: </span>
            <code className="text-xs">{session?.user?.id}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
