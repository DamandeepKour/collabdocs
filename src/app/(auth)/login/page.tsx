import { Suspense } from "react";
import LoginPage from "./login-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading…</div>}>
      <LoginPage />
    </Suspense>
  );
}
