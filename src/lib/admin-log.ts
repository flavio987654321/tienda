import { prisma } from "@/lib/prisma";

type LogInput = {
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  // "MFA": el admin activó o apagó su propia verificación en dos pasos. Es sobre
  // su cuenta y no sobre otra, pero se distingue de "USER" para poder filtrar los
  // cambios de seguridad del panel aparte de las acciones sobre terceros.
  targetType: "USER" | "STORE" | "SUBSCRIPTION" | "MFA";
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
