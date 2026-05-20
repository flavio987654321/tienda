import { prisma } from "@/lib/prisma";
import TestimoniosAdmin from "./TestimoniosAdmin";

export default async function AdminTestimoniosPage() {
  const testimonials = await prisma.testimonial.findMany({
    orderBy: { createdAt: "desc" },
  });
  return <TestimoniosAdmin testimonials={testimonials} />;
}
