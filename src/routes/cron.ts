import cron from "node-cron";
import { syncShipmentStatuses } from "./sync-shipment-statuses";
import { logger } from "../lib/logger";

export function startCronJobs(): void {
 
  cron.schedule("0 0 * * *", async () => {
    // cron.schedule("* * * * *", async () => {
        // cron.schedule("*/30 * * * * *", async () => {
    try {
      logger.info("Starting shipment status sync");
      await syncShipmentStatuses();
      logger.info("Shipment status sync completed");
    } catch (err) {
      logger.error({ err }, "Shipment status sync failed");
    }
  });

  logger.info("Cron jobs scheduled");
}