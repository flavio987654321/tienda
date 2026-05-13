"use client";

import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        {children}
        <Suspense fallback={null}>
          <ProgressBar
            height="3px"
            color="#6366f1"
            options={{ showSpinner: false, minimum: 0.15, trickleSpeed: 120 }}
            shallowRouting
          />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}
