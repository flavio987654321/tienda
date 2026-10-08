"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIGENCIA_MS = 24 * 60 * 60 * 1000;

/** Guarda un borrador sólo en la sesión de esta pestaña; nunca guarda secretos. */
export function useSessionDraft<T>(
  key: string | null,
  initialValue: T,
  hasContent: (value: T) => boolean,
) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const loadedKey = useRef<string | null>(null);
  const initialRef = useRef(initialValue);

  useEffect(() => {
    loadedKey.current = null;
    if (!key) {
      setValue(initialRef.current);
      setLoaded(true);
      return;
    }

    let restored = initialRef.current;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { savedAt?: number; value?: T };
        if (typeof saved.savedAt === "number" && Date.now() - saved.savedAt < VIGENCIA_MS && saved.value) {
          restored = saved.value;
        } else {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      try { sessionStorage.removeItem(key); } catch { /* almacenamiento bloqueado */ }
    }
    setValue(restored);
    loadedKey.current = key;
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded || loadedKey.current !== key || !key) return;
    try {
      if (hasContent(value)) sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
      else sessionStorage.removeItem(key);
    } catch { /* el formulario sigue funcionando aunque el navegador bloquee storage */ }
  }, [hasContent, key, loaded, value]);

  const clearDraft = useCallback(() => {
    if (!key) return;
    try { sessionStorage.removeItem(key); } catch { /* almacenamiento bloqueado */ }
  }, [key]);

  return { value, setValue, clearDraft, loaded };
}
