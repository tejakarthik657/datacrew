import { DatasetWorkspace } from "@/components/dataset/DatasetWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dataset",
};

export default async function DatasetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <DatasetWorkspace datasetId={datasetId}>{children}</DatasetWorkspace>;
}
