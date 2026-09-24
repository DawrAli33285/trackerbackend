import { db, shipmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildSchedule } from "../routes/shipments";

function daysSince(startAt: Date, now: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((now.getTime() - startAt.getTime()) / msPerDay);
}


export async function syncShipmentStatuses(now: Date = new Date()): Promise<void> {
  const shipments = await db.select().from(shipmentsTable);

  for (const shipment of shipments) {
    const isAlreadyDelivered = shipment.currentStatus === "Delivered";
    if (isAlreadyDelivered) continue;

   
    const schedule = shipment.activityLog;
    const elapsedDays = daysSince(shipment.createdAt, now);

    const currentIndex = schedule.findIndex(
      (step) => step.status === shipment.currentStatus && step.location === shipment.currentLocation,
    );
    const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
    const nextStep = schedule[nextIndex];

    
    if (!nextStep || nextStep.dayNumber > elapsedDays) continue;

    await db
      .update(shipmentsTable)
      .set({
        currentStatus: nextStep.status,
        currentLocation: nextStep.location,
        currentFlag: nextStep.flag,
        demoDay: nextStep.dayNumber,
        updatedAt: now,
      })
      .where(eq(shipmentsTable.id, shipment.id));
  }
}