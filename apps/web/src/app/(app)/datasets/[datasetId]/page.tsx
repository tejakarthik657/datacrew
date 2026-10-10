import { redirect } from "next/navigation";

export default function DatasetIndexPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  // Redirect /datasets/[id] -> /datasets/[id]/clean
  return params.then(({ datasetId }) => redirect(`/datasets/${datasetId}/clean`));
}
