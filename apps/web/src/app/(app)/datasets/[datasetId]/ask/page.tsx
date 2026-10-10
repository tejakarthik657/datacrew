import type { Metadata } from "next";
import { AskTab } from "@/components/ask/AskTab";

export const metadata: Metadata = { title: "Ask" };

export default async function AskPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <AskTab datasetId={datasetId} />;
}
