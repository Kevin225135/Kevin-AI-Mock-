import { AppShell } from "@/components/app-shell";
import { SharedReport } from "@/components/shared-report";
type Props={params:Promise<{token:string}>};
export default async function SharedPage({params}:Props){const {token}=await params;return <AppShell><div className="mx-auto max-w-4xl px-5 py-8"><h2 className="mb-6 text-2xl font-semibold">分享的面试复盘</h2><SharedReport token={token}/></div></AppShell>}
