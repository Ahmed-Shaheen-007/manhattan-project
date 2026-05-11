import { pgTable, serial, integer, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const reportTypeEnum = pgEnum("report_type", ["user", "group", "message"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewed", "resolved", "rejected"]);

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: reportTypeEnum("type").notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueReport: unique("unique_report").on(table.reporterId, table.type, table.targetId),
}));

export type Report = typeof reportsTable.$inferSelect;
