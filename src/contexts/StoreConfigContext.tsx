"use client";
import { createContext, useContext } from "react";
import type { StoreConfig } from "@/types/store-config";

export const StoreConfigContext = createContext<StoreConfig | null>(null);

export function useStoreConfig() {
  return useContext(StoreConfigContext);
}
