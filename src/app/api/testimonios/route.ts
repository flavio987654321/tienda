import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const testimonials = await prisma.testimonial.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  return NextResponse.json(testimonials);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`testimonio:${ip}`, 3, 10 * 60_000))) {
    return NextResponse.json({ error: "Demasiados envíos. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json();
  const { name, role, location, text, rating } = body;

  if (!name?.trim() || !role?.trim() || !text?.trim()) {
    return NextResponse.json({ error: "Campos requeridos incompletos" }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "El mensaje es demasiado largo" }, { status: 400 });
  }

  const testimonial = await prisma.testimonial.create({
    data: {
      name: name.trim().slice(0, 80),
      role: role.trim().slice(0, 60),
      location: location?.trim().slice(0, 60) || null,
      text: text.trim().slice(0, 500),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    },
  });

  return NextResponse.json(testimonial, { status: 201 });
}
