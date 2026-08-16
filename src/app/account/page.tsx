import { AppShell } from "@/components/app-shell";
import { AccountPanel } from "@/components/account-panel";

export default function AccountPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AccountPanel />
      </div>
    </AppShell>
  );
}
