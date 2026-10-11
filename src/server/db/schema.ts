import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { OperationTypeCode } from "@/domain/types";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

// Better Auth tables (names and fields imposed by the library) plus the
// application fields `role` and `allowed` (SPEC §4, §13.6).
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  role: text("role", { enum: ["admin", "user"] })
    .default("user")
    .notNull(),
  allowed: integer("allowed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(now)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(now)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(now)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(now)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(now)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(now)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(now)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(now)
    .$onUpdate(() => new Date())
    .notNull(),
});

// Business tables (SPEC §5). Integrity lives in the database: foreign keys,
// CHECK constraints, cascades (§5 "Règles d'intégrité").

const ENERGIES = ["essence", "diesel", "hybride", "electrique"] as const;
const BASELINES = ["unknown", "since_registration"] as const;
const FLUID_TYPES = [
  "huile_moteur",
  "huile_boite",
  "liquide_refroidissement",
  "liquide_frein",
  "autre",
] as const;

const OPERATION_CODES = ["controle_technique", "contre_visite_ct"] as const;
const CATEGORIES = ["entretien", "reparation", "reglementaire"] as const;

/** CHECK mirroring a TypeScript enum (`text({ enum })` is not enforced by SQLite). */
const oneOf = (
  name: string,
  column: AnySQLiteColumn,
  values: readonly string[],
) =>
  check(
    name,
    // Literals: SQLite forbids bound parameters in CHECK. Values are constants.
    sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(", "))})`,
  );

const id = () => integer("id").primaryKey({ autoIncrement: true });
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" }).default(now).notNull();

export const operationType = sqliteTable(
  "operation_type",
  {
    id: id(),
    code: text("code", { enum: OPERATION_CODES })
      .$type<OperationTypeCode>()
      .unique(),
    name: text("name").notNull().unique(),
    category: text("category", { enum: CATEGORIES }).notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
  },
  (t) => [
    oneOf("operation_type_code_valid", t.code, OPERATION_CODES),
    oneOf("operation_type_category_valid", t.category, CATEGORIES),
  ],
);

export const planTemplate = sqliteTable(
  "plan_template",
  {
    id: id(),
    energy: text("energy", { enum: ENERGIES }).notNull().unique(),
  },
  (t) => [oneOf("plan_template_energy_valid", t.energy, ENERGIES)],
);

export const planTemplateItem = sqliteTable(
  "plan_template_item",
  {
    id: id(),
    planTemplateId: integer("plan_template_id")
      .notNull()
      .references(() => planTemplate.id, { onDelete: "cascade" }),
    operationTypeId: integer("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "restrict" }),
    intervalKm: integer("interval_km"),
    intervalMonths: integer("interval_months"),
  },
  (t) => [
    check(
      "interval_required",
      sql`${t.intervalKm} is not null or ${t.intervalMonths} is not null`,
    ),
    index("plan_template_item_template_idx").on(t.planTemplateId),
  ],
);

export const vehicle = sqliteTable(
  "vehicle",
  {
    id: id(),
    // restrict: data is kept when a user is removed from the allow-list (§4).
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    plate: text("plate").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    energy: text("energy", { enum: ENERGIES }).notNull(),
    firstRegistrationDate: text("first_registration_date").notNull(),
    vin: text("vin"),
    archivedAt: text("archived_at"),
    archiveReason: text("archive_reason"),
    createdAt: createdAt(),
  },
  (t) => [
    oneOf("vehicle_energy_valid", t.energy, ENERGIES),
    index("vehicle_owner_idx").on(t.ownerId),
  ],
);

const vehicleId = () =>
  integer("vehicle_id")
    .notNull()
    .references(() => vehicle.id, { onDelete: "cascade" });

export const fluid = sqliteTable(
  "fluid",
  {
    id: id(),
    vehicleId: vehicleId(),
    type: text("type", { enum: FLUID_TYPES }).notNull(),
    quantityL: real("quantity_l").notNull(),
    manufacturerStandard: text("manufacturer_standard").notNull(),
  },
  (t) => [
    oneOf("fluid_type_valid", t.type, FLUID_TYPES),
    index("fluid_vehicle_idx").on(t.vehicleId),
  ],
);

export const part = sqliteTable(
  "part",
  {
    id: id(),
    vehicleId: vehicleId(),
    partType: text("part_type").notNull(),
    brand: text("brand").notNull(),
    reference: text("reference").notNull(),
    notes: text("notes"),
  },
  (t) => [index("part_vehicle_idx").on(t.vehicleId)],
);

export const partUrl = sqliteTable(
  "part_url",
  {
    id: id(),
    partId: integer("part_id")
      .notNull()
      .references(() => part.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label"),
  },
  (t) => [index("part_url_part_idx").on(t.partId)],
);

export const planItem = sqliteTable(
  "plan_item",
  {
    id: id(),
    vehicleId: vehicleId(),
    operationTypeId: integer("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "restrict" }),
    intervalKm: integer("interval_km"),
    intervalMonths: integer("interval_months"),
    baseline: text("baseline", { enum: BASELINES }).notNull(),
  },
  (t) => [
    check(
      "interval_required",
      sql`${t.intervalKm} is not null or ${t.intervalMonths} is not null`,
    ),
    oneOf("plan_item_baseline_valid", t.baseline, BASELINES),
    // One line per operation type; the prefix also serves lookups by vehicle.
    uniqueIndex("plan_item_vehicle_operation_type_unique").on(
      t.vehicleId,
      t.operationTypeId,
    ),
  ],
);

export const odometerReading = sqliteTable(
  "odometer_reading",
  {
    id: id(),
    vehicleId: vehicleId(),
    date: text("date").notNull(),
    displayedKm: integer("displayed_km").notNull(),
  },
  (t) => [index("odometer_reading_vehicle_idx").on(t.vehicleId)],
);

export const odometerReplacement = sqliteTable(
  "odometer_replacement",
  {
    id: id(),
    vehicleId: vehicleId(),
    date: text("date").notNull(),
    oldCounterKm: integer("old_counter_km").notNull(),
    newCounterKm: integer("new_counter_km").notNull(),
  },
  (t) => [index("odometer_replacement_vehicle_idx").on(t.vehicleId)],
);

export const intervention = sqliteTable(
  "intervention",
  {
    id: id(),
    vehicleId: vehicleId(),
    date: text("date").notNull(),
    displayedKm: integer("displayed_km").notNull(),
    provider: text("provider").notNull(),
    laborCostCents: integer("labor_cost_cents").notNull(),
    notes: text("notes"),
  },
  (t) => [index("intervention_vehicle_idx").on(t.vehicleId)],
);

export const interventionOp = sqliteTable(
  "intervention_op",
  {
    id: id(),
    interventionId: integer("intervention_id")
      .notNull()
      .references(() => intervention.id, { onDelete: "cascade" }),
    operationTypeId: integer("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "restrict" }),
    detail: text("detail"),
  },
  (t) => [index("intervention_op_intervention_idx").on(t.interventionId)],
);

export const partLine = sqliteTable(
  "part_line",
  {
    id: id(),
    interventionOpId: integer("intervention_op_id")
      .notNull()
      .references(() => interventionOp.id, { onDelete: "cascade" }),
    // restrict: a part referenced by a line cannot be deleted (§5).
    partId: integer("part_id").references(() => part.id, {
      onDelete: "restrict",
    }),
    label: text("label"),
    quantity: real("quantity").notNull(),
    amountCents: integer("amount_cents").notNull(),
  },
  (t) => [
    check(
      "part_or_label_required",
      sql`${t.partId} is not null or ${t.label} is not null`,
    ),
    index("part_line_op_idx").on(t.interventionOpId),
    index("part_line_part_idx").on(t.partId),
  ],
);

export const invoiceFile = sqliteTable(
  "invoice_file",
  {
    id: id(),
    interventionId: integer("intervention_id")
      .notNull()
      .references(() => intervention.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    originalMime: text("original_mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storedPdfPath: text("stored_pdf_path").notNull(),
    uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" })
      .default(now)
      .notNull(),
  },
  (t) => [index("invoice_file_intervention_idx").on(t.interventionId)],
);

export const calendarToken = sqliteTable("calendar_token", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  createdAt: createdAt(),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
});
