import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type ShipmentActivity = {
  dayNumber: number;
  status: string;
  location: string;
  flag: string;
  activityText: string;
  dateLabel: string;
};

export const shipmentsTable = pgTable(
  "shipments",
  {
    id: serial("id").primaryKey(),
    trackingNumber: varchar("tracking_number", { length: 12 }).notNull(),
    recipientName: text("recipient_name").notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    townCity: text("town_city").notNull(),
    itemsOrdered: jsonb("items_ordered").$type<string[]>().notNull(),
    carrierLabel: text("carrier_label").notNull(),
    startDate: text("start_date").notNull(),
    currentStatus: text("current_status").notNull(),
    currentLocation: text("current_location").notNull(),
    currentFlag: varchar("current_flag", { length: 2 }).notNull(),
    demoDay: integer("demo_day").notNull(),
    activityLog: jsonb("activity_log").$type<ShipmentActivity[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    trackingNumberUnique: uniqueIndex("shipments_tracking_number_unique").on(table.trackingNumber),
  }),
);

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;