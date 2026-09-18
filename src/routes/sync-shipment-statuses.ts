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

    const destination = shipment.currentLocation.includes("South Africa")
      ? shipment.currentLocation
      : `${shipment.townCity}, South Africa`;

    const schedule = buildSchedule(destination, shipment.currentFlag ?? "ZA");
    const elapsedDays = daysSince(shipment.createdAt, now);

    
    let matchedStep = schedule[0];
    let matchedIndex = 0;
    for (let i = 0; i < schedule.length; i++) {
      if (schedule[i].dayOffset <= elapsedDays) {
        matchedStep = schedule[i];
        matchedIndex = i;
      } else {
        break;
      }
    }

    const hasChanged =
      shipment.currentStatus !== matchedStep.status ||
      shipment.currentLocation !== matchedStep.location;

    if (!hasChanged) continue;

    await db
      .update(shipmentsTable)
      .set({
        currentStatus: matchedStep.status,
        currentLocation: matchedStep.location,
        currentFlag: matchedStep.flag,
        demoDay: matchedIndex + 1,
        updatedAt: now,
      })
      .where(eq(shipmentsTable.id, shipment.id));
  }
}