import { useRef, useState } from "react";

export function useSavedNumberField(initialValue: number, save: (value: number) => Promise<void>) {
  const [text, setText] = useState(String(initialValue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const lastSaved = useRef(initialValue);
  const committing = useRef(false);

  async function commit() {
    if (committing.current) return;
    const value = Number(text);
    if (!text.trim() || Number.isNaN(value) || value <= 0) {
      setError("Tiene que ser un número mayor a 0");
      return;
    }
    if (value === lastSaved.current) return;

    committing.current = true;
    setSaving(true);
    setError(null);
    try {
      await save(value);
      lastSaved.current = value;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
      committing.current = false;
    }
  }

  return {
    text,
    setText,
    saving,
    error,
    saved,
    inputProps: {
      value: text,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") e.currentTarget.blur();
      },
    },
  };
}
