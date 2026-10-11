import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authStore } from "@/server/data/auth-store";

function build() {
  const { db, schema } = authStore();
  return betterAuth({
    baseURL: process.env.APP_URL,
    secret: process.env.AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "user", input: false },
        allowed: { type: "boolean", defaultValue: false, input: false },
      },
    },
    // 30 rolling days (SPEC §13.6)
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  });
}

let instance: ReturnType<typeof build> | undefined;

/** Lazy: env vars are only read at first request, not at build time. */
export function getAuth() {
  return (instance ??= build());
}
