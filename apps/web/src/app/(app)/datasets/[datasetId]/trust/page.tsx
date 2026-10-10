import type { Metadata } from "next";
import { TrustTab } from "@/components/trust/TrustTab";

export const metadata: Metadata = { title: "Trust & Privacy" };

export default async function TrustPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <TrustTab datasetId={datasetId} />;
}
