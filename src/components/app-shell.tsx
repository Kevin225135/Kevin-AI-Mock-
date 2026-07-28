import type { ReactNode } from "react";
import { GlobalNavigation } from "./global-navigation";
import { PageTransition } from "./ui/motion";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden text-foreground">
      <GlobalNavigation />
      <PageTransition>{children}</PageTransition>
    </main>
  );
}
