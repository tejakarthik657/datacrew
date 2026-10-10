import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PassportView } from "@/components/passport/PassportView";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const metadata: Metadata = {
  title: "Data Passport",
  description: "Cryptographically verified, tamper-evident Data Passport.",
};

async function getPassport(publicId: string) {
  try {
    const res = await fetch(`${API_URL}/passports/${publicId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function PublicPassportPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const doc = await getPassport(publicId);

  if (!doc) {
    notFound();
  }

  return <PassportView doc={doc} />;
}
