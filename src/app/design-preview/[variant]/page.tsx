import { notFound } from "next/navigation";
import { DesignPreview } from "@/components/design-preview";

const variants = new Set(["1", "2", "3"]);

export function generateStaticParams() {
  return [...variants].map((variant) => ({ variant }));
}

export default async function DesignPreviewPage({
  params
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (!variants.has(variant)) notFound();
  return <DesignPreview variant={variant as "1" | "2" | "3"} />;
}
