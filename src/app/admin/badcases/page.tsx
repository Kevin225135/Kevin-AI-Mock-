import { AppShell } from "@/components/app-shell";
import { BadcasePanel } from "@/components/badcase-panel";
export default function BadcasesPage() { return <AppShell><div className="mx-auto max-w-5xl px-5 py-8"><h2 className="mb-6 text-2xl font-semibold">Badcase 管理</h2><BadcasePanel /></div></AppShell>; }
