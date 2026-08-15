"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? "";

export default function CrispWidget() {
  const pathname = usePathname();

  useEffect(() => {
    if (!CRISP_WEBSITE_ID) return;
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!window.$crisp) return;
    const hidden = pathname.startsWith("/dashboard") || pathname.startsWith("/afiliados") || pathname.startsWith("/tienda/") || pathname.startsWith("/preview/");
    window.$crisp.push(["do", hidden ? "chat:hide" : "chat:show"]);
  }, [pathname]);

  return null;
}
