import type { Metadata } from "next";
import { ForecastTab } from "@/components/forecast/ForecastTab";

export const metadata: Metadata = { title: "Forecast" };

export default async function ForecastPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <ForecastTab datasetId={datasetId} />;
}
