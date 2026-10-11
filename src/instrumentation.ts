export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runStartupMigrations } = await import("@/server/data/startup");
  const { logger } = await import("@/server/logger");
  const hasAdmin = runStartupMigrations();
  logger.info("migrations applied, catalogue seeded");
  if (!hasAdmin)
    logger.warn("ADMIN_EMAIL is not set: no administrator enrolled");
}
