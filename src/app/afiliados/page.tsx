export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import VendedorasClient from "./VendedorasClient";

export default async function VendedorasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <VendedorasClient />;
}
