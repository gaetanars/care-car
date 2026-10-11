import { pingDb } from "@/server/data/health";
import { logger } from "@/server/logger";

export function GET() {
  try {
    pingDb();
    return Response.json({ status: "ok" });
  } catch (error) {
    logger.error("health check failed", { error: String(error) });
    return Response.json({ status: "error" }, { status: 503 });
  }
}
