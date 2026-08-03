import { permanentRedirect } from "next/navigation";

/** Igual que `/canasta`: mudanza definitiva, 308 y no 307. Ver el comentario de al lado. */
export default function CanastaCampanaPage() {
  permanentRedirect("/comunidad/campana");
}
