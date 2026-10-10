import type { Metadata } from "next";
import { DatasetsClient } from "./DatasetsClient";

export const metadata: Metadata = {
  title: "Datasets",
  description: "Upload, manage and clean your datasets with DataCrew AI.",
};

export default function DatasetsPage() {
  return <DatasetsClient />;
}
