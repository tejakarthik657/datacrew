import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dc_jwt")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    // Redirect to login; client-side will append ?next=
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
