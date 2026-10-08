import type { ReactNode } from "react";
import StoreNavigationLoading from "@/components/store/StoreNavigationLoading";

export default function TiendaSlugLayout({ children }: { children: ReactNode }) {
  return <>{children}<StoreNavigationLoading /></>;
}
