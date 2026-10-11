export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runStartupMigrations } = await import("@/server/data/startup");
  const { logger } = await import("@/server/logger");
  runStartupMigrations();
  logger.info("migrations applied");
}
