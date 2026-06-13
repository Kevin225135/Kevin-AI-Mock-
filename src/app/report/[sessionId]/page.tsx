import { AppShell } from "@/components/app-shell";
import { ReportView } from "@/components/report-view";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ReportPage({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ReportView sessionId={sessionId} />
      </div>
    </AppShell>
  );
}
