"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ProgressBar height="3px" color="#6366f1" options={{ showSpinner: false }} shallowRouting />
    </AuthProvider>
  );
}
