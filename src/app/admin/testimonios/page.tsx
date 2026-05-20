import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import TestimoniosAdmin from "./TestimoniosAdmin";

const ADMIN_EMAIL = "qrdreamcar@gmail.com";

export default async function AdminTestimoniosPage() {
  const user = await getCurrentUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const testimonials = await prisma.testimonial.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <TestimoniosAdmin testimonials={testimonials} />;
}
