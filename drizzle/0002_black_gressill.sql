DROP INDEX `plan_item_vehicle_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `plan_item_vehicle_operation_type_unique` ON `plan_item` (`vehicle_id`,`operation_type_id`);