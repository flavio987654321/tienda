import { prisma } from "@/lib/prisma";

type LogInput = {
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetType: "USER" | "STORE" | "SUBSCRIPTION";
  details?: Record<string, unknown>;
  ip?: string | null;
};

export async function logAdminAction(input: LogInput): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId: input.adminId,
        adminEmail: input.adminEmail,
        action: input.action,
        targetId: input.targetId,
        targetType: input.targetType,
        details: JSON.stringify(input.details ?? {}),
        ip: input.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[admin-log] Error al registrar acción:", e);
  }
}
