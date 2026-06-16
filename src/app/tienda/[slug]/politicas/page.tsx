import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tipo?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findFirst({ where: { slug, isActive: true }, select: { name: true } });
  if (!store) return {};
  return { title: `Información legal — ${store.name}` };
}

function groupContent(text: string) {
  const lines = text.split("\n").filter(l => l.trim());
  const groups: { type: "p" | "ul"; items: string[] }[] = [];
  for (const line of lines) {
    const isBullet = line.trimStart().startsWith("-");
    if (isBullet) {
      if (groups.length && groups[groups.length - 1].type === "ul") {
        groups[groups.length - 1].items.push(line.replace(/^\s*-\s*/, ""));
      } else {
        groups.push({ type: "ul", items: [line.replace(/^\s*-\s*/, "")] });
      }
    } else {
      groups.push({ type: "p", items: [line] });
    }
  }
  return groups;
}

export default async function PoliticasPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tipo } = await searchParams;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      slug: true,
      primaryColor: true,
      logo: true,
      storeConfig: true,
      policyReturns: true,
      policyShipping: true,
      policyTerms: true,
      owner: { select: { email: true } },
    },
  });
  if (!store) notFound();

  const acc = store.primaryColor || "#6366f1";

  // textOverrides tienen prioridad; si no, caemos a los campos legados de DB
  let parsedConfig: { textOverrides?: Record<string, { text?: string }> } = {};
  try { parsedConfig = JSON.parse(store.storeConfig || "{}"); } catch { /* ignore */ }
  const ov = parsedConfig.textOverrides ?? {};

  const policies = {
    devoluciones: ov["policyReturns"]?.text  || store.policyReturns  || null,
    envios:       ov["policyShipping"]?.text || store.policyShipping || null,
    terminos:     ov["policyTerms"]?.text    || store.policyTerms    || null,
  };

  const TABS = [
    { id: "devoluciones", label: "Devoluciones", icon: "↩️" },
    { id: "envios",       label: "Envíos",        icon: "📦" },
    { id: "terminos",     label: "Términos",      icon: "📋" },
  ] as const;

  const activeId = (tipo && policies[tipo as keyof typeof policies])
    ? tipo as keyof typeof policies
    : (Object.entries(policies).find(([, v]) => v)?.[0] as keyof typeof policies | undefined) ?? "devoluciones";

  const activeContent = policies[activeId];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          {store.logo ? (
            <img src={store.logo} alt={store.name} className="h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: acc }}>
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="text-base font-bold text-white">{store.name}</span>
        </div>
      </nav>

      <div className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">

          <Link href={`/tienda/${slug}`} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Volver a la tienda
          </Link>

          <h1 className="text-4xl font-black mb-2">Información legal</h1>
          <p className="text-gray-500 text-sm mb-8">{store.name}</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-10 flex-wrap">
            {TABS.map(t => {
              const hasContent = !!policies[t.id];
              const isActive = t.id === activeId;
              return (
                <Link
                  key={t.id}
                  href={`/tienda/${slug}/politicas?tipo=${t.id}`}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    !hasContent
                      ? "border-white/5 text-gray-600 cursor-default pointer-events-none"
                      : isActive
                      ? "border-transparent text-white"
                      : "border-white/10 text-gray-400 hover:text-gray-200"
                  }`}
                  style={isActive && hasContent ? { background: `${acc}22`, borderColor: `${acc}55`, color: acc } : {}}
                >
                  {t.icon} {t.label}
                </Link>
              );
            })}
          </div>

          {/* Contenido */}
          {activeContent ? (
            <div className="space-y-4">
              {groupContent(activeContent).map((group, i) =>
                group.type === "ul" ? (
                  <ul key={i} className="list-disc list-inside space-y-1.5 ml-1">
                    {group.items.map((item, j) => (
                      <li key={j} className="text-sm leading-relaxed text-gray-300">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="text-sm leading-relaxed text-gray-300">{group.items[0]}</p>
                )
              )}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-gray-600 text-base">Esta tienda aún no publicó esta política.</p>
              <p className="text-gray-700 text-sm mt-1">Contactá a la tienda para más información.</p>
            </div>
          )}

          {/* Derechos del consumidor */}
          <div className="mt-12 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 space-y-3">
            <p className="text-sm font-bold text-yellow-400">📋 Tus derechos como consumidor (Ley 24.240 — Argentina)</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-yellow-200/70">
              <li><strong>Arrepentimiento:</strong> Podés cancelar una compra online dentro de los <strong>10 días corridos</strong> desde que recibiste el producto, sin costo.</li>
              <li><strong>Garantía legal:</strong> Los productos tienen garantía de 6 meses (nuevos) o 3 meses (usados).</li>
              <li><strong>Información clara:</strong> Tenés derecho a conocer el precio total y condiciones antes de comprar.</li>
              <li><strong>Reclamos:</strong> Podés contactar a Defensa del Consumidor de tu provincia sin cargo.</li>
            </ul>
            <p className="text-xs text-yellow-600">
              Más info:{" "}
              <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-400">
                argentina.gob.ar/defensadelconsumidor
              </a>
            </p>
          </div>

          {/* Contacto */}
          <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <p className="text-xs font-bold text-gray-400 mb-1">📬 Contacto con la tienda</p>
            <p className="text-xs text-gray-500">
              Para consultas sobre devoluciones o envíos contactá directamente a <strong className="text-gray-300">{store.name}</strong>
              {store.owner?.email ? (
                <> · <a href={`mailto:${store.owner.email}`} className="text-gray-300 hover:underline">{store.owner.email}</a></>
              ) : " desde el formulario de la tienda"}.
            </p>
            <p className="text-xs text-gray-700 mt-2">
              Plataforma: TiendaApps · Responsable: Flavio Cesar Soltero Legoas · soporte:{" "}
              <a href="mailto:marketplacemitienda@gmail.com" className="hover:underline">marketplacemitienda@gmail.com</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
