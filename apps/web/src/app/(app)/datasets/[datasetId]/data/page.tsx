import type { Metadata } from "next";
import { DataTab } from "@/components/data/DataTab";

export const metadata: Metadata = { title: "Data & Versions" };

export default async function DataPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <DataTab datasetId={datasetId} />;
}
