import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense>
          <AuthPanel mode="login" />
        </Suspense>
      </div>
    </AppShell>
  );
}
