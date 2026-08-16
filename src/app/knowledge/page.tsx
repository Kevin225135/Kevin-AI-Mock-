import { AppShell } from "@/components/app-shell";
import { KnowledgeLibrary } from "@/components/knowledge-library";

export default function KnowledgePage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <KnowledgeLibrary />
      </main>
    </AppShell>
  );
}
