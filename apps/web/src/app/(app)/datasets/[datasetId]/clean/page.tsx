import type { Metadata } from "next";
import { CleanTab } from "@/components/plan/CleanTab";

export const metadata: Metadata = { title: "Clean" };

export default async function CleanPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <CleanTab datasetId={datasetId} />;
}
