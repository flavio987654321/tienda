"use client";

import Link from "next/link";

export default function VisitorBackButton() {
  return (
    <Link
      href="/tiendas"
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 500,
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "rgba(10,10,10,0.45)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
        transition: "background 0.2s, transform 0.2s",
        textDecoration: "none",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(10,10,10,0.72)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(10,10,10,0.45)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      title="Explorar tiendas"
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </Link>
  );
}
