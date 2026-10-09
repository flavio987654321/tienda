import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { registrarEventoSeguridad } from "./lib/security-events";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  Sentry.captureRequestError(error, request, context);
  await registrarEventoSeguridad({
    kind: "SERVER_ERROR",
    origin: "UNKNOWN",
    route: context.routePath || request.path.split("?")[0],
    method: request.method,
    status: 500,
    reason: "unhandled_request_error",
    errorName: error instanceof Error ? error.name : "UnknownError",
    requestId: typeof error === "object" && error !== null && "digest" in error
      && typeof error.digest === "string"
      ? error.digest
      : undefined,
    headers: request.headers,
  });
};
