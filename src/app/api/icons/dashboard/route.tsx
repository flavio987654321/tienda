import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const raw = parseInt(req.nextUrl.searchParams.get("size") ?? "512");
  const s = Math.min(Math.max(raw, 16), 1024);
  const icon = Math.round(s * 0.46);
  const radius = Math.round(s * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: s,
          height: s,
          background: "linear-gradient(145deg, #6366f1 0%, #4f46e5 60%, #3730a3 100%)",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Shopping bag — Lucide path */}
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
    ),
    { width: s, height: s },
  );
}
