import type { Metadata } from "next";
import { StrategyTab } from "@/components/strategy/StrategyTab";

export const metadata: Metadata = { title: "Strategy" };

export default async function StrategyPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <StrategyTab datasetId={datasetId} />;
}
