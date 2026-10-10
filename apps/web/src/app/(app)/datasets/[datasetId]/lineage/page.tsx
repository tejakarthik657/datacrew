import type { Metadata } from "next";
import { LineageTab } from "@/components/lineage/LineageTab";

export const metadata: Metadata = { title: "Lineage" };

export default async function LineagePage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <LineageTab datasetId={datasetId} />;
}
