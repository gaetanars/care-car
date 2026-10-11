import "server-only";

type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg,
    ...fields,
  });
  process.stdout.write(`${line}\n`);
}

/** JSON logs on stdout (SPEC §13.4). */
export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) =>
    log("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) =>
    log("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) =>
    log("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) =>
    log("error", msg, fields),
};
