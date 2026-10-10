import type { Metadata } from "next";
import { DedupeTab } from "@/components/dedupe/DedupeTab";

export const metadata: Metadata = { title: "Dedupe" };

export default async function DedupePage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <DedupeTab datasetId={datasetId} />;
}
