"use client";
/** El campo invisible para bots. Ver `lib/trampaBots`. */
import { CAMPO_TRAMPA } from "@/lib/trampaBots";

export default function CampoTrampa({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: -10000, top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        No completar
        <input type="text" name={CAMPO_TRAMPA} tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
