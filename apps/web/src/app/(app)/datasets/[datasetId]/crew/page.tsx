import type { Metadata } from "next";
import { CrewTab } from "@/components/crew/CrewTab";

export const metadata: Metadata = { title: "Crew" };

export default async function CrewPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <CrewTab datasetId={datasetId} />;
}
