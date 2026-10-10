import type { Metadata } from "next";
import { RisksTab } from "@/components/risks/RisksTab";

export const metadata: Metadata = { title: "Risks & Rules" };

export default async function RisksPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <RisksTab datasetId={datasetId} />;
}
