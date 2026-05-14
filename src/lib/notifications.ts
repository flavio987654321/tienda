import { prisma } from "@/lib/prisma";

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input }).catch(() => {});
}

export async function createNotificationMany(inputs: CreateNotificationInput[]) {
  if (!inputs.length) return;
  return prisma.notification.createMany({ data: inputs }).catch(() => {});
}
