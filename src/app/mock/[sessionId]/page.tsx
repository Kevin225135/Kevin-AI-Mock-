import { AppShell } from "@/components/app-shell";
import { MockRoom } from "@/components/mock-room";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function MockPage({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <MockRoom sessionId={sessionId} />
      </div>
    </AppShell>
  );
}
