import { getCurrentUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PagosClient from "./PagosClient";
import type { StorePaymentInfo } from "@/types/store-config";
import { DEFAULT_PAYMENT_INFO } from "@/types/store-config";

export default async function PagosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      storeConfig: true,
      policyReturns: true,
      policyShipping: true,
      policyTerms: true,
      policyReturnsActive: true,
      policyShippingActive: true,
      policyTermsActive: true,
    },
  });

  let paymentInfo: StorePaymentInfo = DEFAULT_PAYMENT_INFO;
  try {
    const config = JSON.parse(store?.storeConfig || "{}");
    if (config.paymentInfo) paymentInfo = config.paymentInfo;
  } catch { /* noop */ }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-black text-gray-900 mt-3">Pagos y legales</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configurá cómo cobrar y tus políticas. Aparecen automáticamente en los emails y en tu tienda.
        </p>
      </div>

      <PagosClient
        initial={{
          paymentInfo,
          policyReturns: store?.policyReturns ?? "",
          policyShipping: store?.policyShipping ?? "",
          policyTerms: store?.policyTerms ?? "",
          policyReturnsActive: store?.policyReturnsActive ?? true,
          policyShippingActive: store?.policyShippingActive ?? true,
          policyTermsActive: store?.policyTermsActive ?? true,
        }}
      />
    </div>
  );
}
