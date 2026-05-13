import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tipo?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findFirst({ where: { slug, isActive: true }, select: { name: true } });
  if (!store) return {};
  return { title: `Políticas legales — ${store.name}` };
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
      fontFamily: true,
      logo: true,
      policyReturns: true,
      policyShipping: true,
      policyTerms: true,
    },
  });
  if (!store) notFound();

  const allSections = [
    { id: "devoluciones", label: "Política de devoluciones", icon: "↩️", content: store.policyReturns },
    { id: "envios",       label: "Política de envíos",       icon: "📦", content: store.policyShipping },
    { id: "terminos",     label: "Términos y condiciones",   icon: "📋", content: store.policyTerms },
  ].filter(s => s.content);

  // Si viene ?tipo= mostramos solo esa sección
  const sections = tipo ? allSections.filter(s => s.id === tipo) : allSections;
  const hasAny = sections.length > 0;
  const otherSections = tipo ? allSections.filter(s => s.id !== tipo) : [];

  return (
    <div style={{ fontFamily: store.fontFamily || "Inter", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header simple */}
      <header style={{ backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Link href={`/tienda/${slug}`} style={{ color: store.primaryColor, fontWeight: 700, fontSize: "14px", textDecoration: "none" }}>
          ← Volver a la tienda
        </Link>
        {store.logo && <img src={store.logo} alt={store.name} style={{ height: "32px", objectFit: "contain" }} />}
      </header>

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#111827", marginBottom: "8px" }}>
          {sections.length === 1 ? sections[0].label : "Información legal"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "40px" }}>{store.name}</p>

        {!hasAny && (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#9ca3af" }}>
            <p style={{ fontSize: "48px", marginBottom: "12px" }}>📋</p>
            <p style={{ fontSize: "16px", fontWeight: 600 }}>Esta tienda aún no publicó sus políticas</p>
            <p style={{ fontSize: "14px", marginTop: "6px" }}>Comunicate con la tienda para más información</p>
          </div>
        )}

        {sections.map((section, i) => (
          <section key={section.id} id={section.id} style={{ marginBottom: "40px" }}>
            {i > 0 && <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", marginBottom: "40px" }} />}
            {sections.length > 1 && (
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{section.icon}</span> {section.label}
              </h2>
            )}
            <div style={{ color: "#374151", fontSize: "15px", lineHeight: 1.8, whiteSpace: "pre-line" }}>
              {section.content}
            </div>
          </section>
        ))}

        {/* Links a las otras políticas */}
        {otherSections.length > 0 && (
          <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Otras políticas
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {otherSections.map(s => (
                <Link key={s.id} href={`/tienda/${slug}/politicas?tipo=${s.id}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "999px", border: `1px solid ${store.primaryColor}`, color: store.primaryColor, fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
                  {s.icon} {s.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
        © {new Date().getFullYear()} {store.name}
      </footer>
    </div>
  );
}
