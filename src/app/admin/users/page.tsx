import { AdminUsersPanel } from "@/components/admin-users-panel";
import { AppShell } from "@/components/app-shell";

export default function AdminUsersPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminUsersPanel />
      </div>
    </AppShell>
  );
}
