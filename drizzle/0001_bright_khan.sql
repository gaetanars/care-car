CREATE TABLE `calendar_token` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `fluid` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity_l` real NOT NULL,
	`manufacturer_standard` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "fluid_type_valid" CHECK("fluid"."type" in ('huile_moteur', 'huile_boite', 'liquide_refroidissement', 'liquide_frein', 'autre'))
);
--> statement-breakpoint
CREATE INDEX `fluid_vehicle_idx` ON `fluid` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `intervention` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`date` text NOT NULL,
	`displayed_km` integer NOT NULL,
	`provider` text NOT NULL,
	`labor_cost_cents` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `intervention_vehicle_idx` ON `intervention` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `intervention_op` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`intervention_id` integer NOT NULL,
	`operation_type_id` integer NOT NULL,
	`detail` text,
	FOREIGN KEY (`intervention_id`) REFERENCES `intervention`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`operation_type_id`) REFERENCES `operation_type`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `intervention_op_intervention_idx` ON `intervention_op` (`intervention_id`);--> statement-breakpoint
CREATE TABLE `invoice_file` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`intervention_id` integer NOT NULL,
	`original_name` text NOT NULL,
	`original_mime` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`stored_pdf_path` text NOT NULL,
	`uploaded_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`intervention_id`) REFERENCES `intervention`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_file_intervention_idx` ON `invoice_file` (`intervention_id`);--> statement-breakpoint
CREATE TABLE `odometer_reading` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`date` text NOT NULL,
	`displayed_km` integer NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `odometer_reading_vehicle_idx` ON `odometer_reading` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `odometer_replacement` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`date` text NOT NULL,
	`old_counter_km` integer NOT NULL,
	`new_counter_km` integer NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `odometer_replacement_vehicle_idx` ON `odometer_replacement` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `operation_type` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	CONSTRAINT "operation_type_code_valid" CHECK("operation_type"."code" in ('controle_technique', 'contre_visite_ct')),
	CONSTRAINT "operation_type_category_valid" CHECK("operation_type"."category" in ('entretien', 'reparation', 'reglementaire'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operation_type_code_unique` ON `operation_type` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `operation_type_name_unique` ON `operation_type` (`name`);--> statement-breakpoint
CREATE TABLE `part` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`part_type` text NOT NULL,
	`brand` text NOT NULL,
	`reference` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `part_vehicle_idx` ON `part` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `part_line` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`intervention_op_id` integer NOT NULL,
	`part_id` integer,
	`label` text,
	`quantity` real NOT NULL,
	`amount_cents` integer NOT NULL,
	FOREIGN KEY (`intervention_op_id`) REFERENCES `intervention_op`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`part_id`) REFERENCES `part`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "part_or_label_required" CHECK("part_line"."part_id" is not null or "part_line"."label" is not null)
);
--> statement-breakpoint
CREATE INDEX `part_line_op_idx` ON `part_line` (`intervention_op_id`);--> statement-breakpoint
CREATE INDEX `part_line_part_idx` ON `part_line` (`part_id`);--> statement-breakpoint
CREATE TABLE `part_url` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_id` integer NOT NULL,
	`url` text NOT NULL,
	`label` text,
	FOREIGN KEY (`part_id`) REFERENCES `part`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `part_url_part_idx` ON `part_url` (`part_id`);--> statement-breakpoint
CREATE TABLE `plan_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`operation_type_id` integer NOT NULL,
	`interval_km` integer,
	`interval_months` integer,
	`baseline` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`operation_type_id`) REFERENCES `operation_type`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "interval_required" CHECK("plan_item"."interval_km" is not null or "plan_item"."interval_months" is not null),
	CONSTRAINT "plan_item_baseline_valid" CHECK("plan_item"."baseline" in ('unknown', 'since_registration'))
);
--> statement-breakpoint
CREATE INDEX `plan_item_vehicle_idx` ON `plan_item` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `plan_template` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`energy` text NOT NULL,
	CONSTRAINT "plan_template_energy_valid" CHECK("plan_template"."energy" in ('essence', 'diesel', 'hybride', 'electrique'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_template_energy_unique` ON `plan_template` (`energy`);--> statement-breakpoint
CREATE TABLE `plan_template_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_template_id` integer NOT NULL,
	`operation_type_id` integer NOT NULL,
	`interval_km` integer,
	`interval_months` integer,
	FOREIGN KEY (`plan_template_id`) REFERENCES `plan_template`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`operation_type_id`) REFERENCES `operation_type`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "interval_required" CHECK("plan_template_item"."interval_km" is not null or "plan_template_item"."interval_months" is not null)
);
--> statement-breakpoint
CREATE INDEX `plan_template_item_template_idx` ON `plan_template_item` (`plan_template_id`);--> statement-breakpoint
CREATE TABLE `vehicle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`plate` text NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`energy` text NOT NULL,
	`first_registration_date` text NOT NULL,
	`vin` text,
	`archived_at` text,
	`archive_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "vehicle_energy_valid" CHECK("vehicle"."energy" in ('essence', 'diesel', 'hybride', 'electrique'))
);
--> statement-breakpoint
CREATE INDEX `vehicle_owner_idx` ON `vehicle` (`owner_id`);