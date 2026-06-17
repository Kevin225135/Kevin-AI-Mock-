import { AppShell } from "@/components/app-shell";
import { StartMockForm } from "@/components/start-mock-form";

export default function HomePage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <StartMockForm />
      </div>
    </AppShell>
  );
}
