import type { Metadata } from "next";
import { CrewRunView } from "@/components/crew/CrewRunView";

export const metadata: Metadata = {
  title: "Crew Run",
};

export default async function CrewRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return <CrewRunView runId={runId} />;
}
