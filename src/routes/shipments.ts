import { Router, type IRouter } from "express";
import {
  CreateShipmentBody,
  DeleteShipmentParams,
  GetShipmentParams,
  UpdateShipmentBody,
  UpdateShipmentParams,
} from "@workspace/api-zod";
import { db, shipmentsTable, type ShipmentActivity } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";


const router: IRouter = Router();
console.log("[shipments] route file loaded: v3");
type ShipmentPayload = {
  trackingNumber: string;
  recipientName: string;
  deliveryAddress: string;
  townCity: string;
  itemsOrdered: string[];
  carrierLabel: string;
  startDate: string;
  currentStatus: string;

  currentLocation: string;
  currentFlag: string;
  demoDay: number;
  activityLog: ShipmentActivity[];
};

type ScheduleStep = {
  dayOffset: number;
  hour: number;
  minute: number;
  status: string;
  location: string;
  flag: string;
  activityText: string;
};

export function buildSchedule(destination: string, destinationFlag: string): ScheduleStep[] {
  return [
    { dayOffset: 1, hour: 9, minute: 0, status: "Order Placed", location: "Austin, USA", flag: "US", activityText: "Order confirmed. Preparing for packing." },
    { dayOffset: 3, hour: 9, minute: 0, status: "Packed at Warehouse", location: "Austin, USA", flag: "US", activityText: "Item packed and sealed." },
    { dayOffset: 5, hour: 9, minute: 0, status: "Picked Up", location: "Austin, USA", flag: "US", activityText: "Parcel collected by freight partner." },
    { dayOffset: 7, hour: 9, minute: 0, status: "At Export Hub", location: "Dallas, USA", flag: "US", activityText: "Parcel arrived at Dallas export hub." },
    { dayOffset: 9, hour: 9, minute: 0, status: "Export Processing", location: "Dallas, USA", flag: "US", activityText: "Export documentation submitted." },
    { dayOffset: 11, hour: 9, minute: 0, status: "Cleared for Export", location: "Dallas, USA", flag: "US", activityText: "Export clearance approved." },
    { dayOffset: 12, hour: 9, minute: 0, status: "Departed USA", location: "Dallas, USA", flag: "US", activityText: "Parcel departed Dallas on flight to Frankfurt." },
    { dayOffset: 13, hour: 9, minute: 0, status: "In Transit", location: "Over Atlantic", flag: "US", activityText: "Parcel in transit to Frankfurt." },
    { dayOffset: 15, hour: 9, minute: 0, status: "Arrived Germany", location: "Frankfurt, Germany", flag: "DE", activityText: "Parcel arrived at Frankfurt Airport." },
    { dayOffset: 17, hour: 9, minute: 0, status: "At Transit Hub", location: "Frankfurt, Germany", flag: "DE", activityText: "Parcel transferred to international transit facility." },
    { dayOffset: 19, hour: 9, minute: 0, status: "Awaiting Connection", location: "Frankfurt, Germany", flag: "DE", activityText: "Awaiting connecting flight to Dubai." },
    { dayOffset: 21, hour: 9, minute: 0, status: "Flight Delayed", location: "Frankfurt, Germany", flag: "DE", activityText: "Connecting flight delayed. Rescheduled." },
    { dayOffset: 23, hour: 9, minute: 0, status: "Rescheduled", location: "Frankfurt, Germany", flag: "DE", activityText: "Parcel rebooked on next available flight." },
    { dayOffset: 25, hour: 9, minute: 0, status: "Documentation", location: "Frankfurt, Germany", flag: "DE", activityText: "Export documentation for UAE submitted." },
    { dayOffset: 28, hour: 9, minute: 0, status: "Departed Germany, Berlin", location: "Frankfurt, Germany", flag: "DE", activityText: "Parcel departed Frankfurt on flight to Dubai." },
    { dayOffset: 29, hour: 9, minute: 0, status: "In Transit", location: "Over Europe", flag: "DE", activityText: "Parcel in transit to Dubai." },
    { dayOffset: 31, hour: 9, minute: 0, status: "Arrived UAE", location: "Dubai, UAE", flag: "AE", activityText: "Parcel arrived at Dubai International Airport." },
    { dayOffset: 33, hour: 9, minute: 0, status: "At Transit Hub", location: "Dubai, UAE", flag: "AE", activityText: "Parcel transferred to Dubai transit facility." },
    { dayOffset: 35, hour: 9, minute: 0, status: "Awaiting Connection", location: "Dubai, UAE", flag: "AE", activityText: "Awaiting connecting flight to Nairobi." },
    { dayOffset: 37, hour: 9, minute: 0, status: "Flight Rescheduled", location: "Dubai, UAE", flag: "AE", activityText: "Connecting flight rescheduled." },
    { dayOffset: 39, hour: 9, minute: 0, status: "Rebooked", location: "Dubai, UAE", flag: "AE", activityText: "Parcel rebooked on next available flight." },
    { dayOffset: 41, hour: 9, minute: 0, status: "Documentation", location: "Dubai, UAE", flag: "AE", activityText: "Export documentation for Kenya submitted." },
    { dayOffset: 43, hour: 9, minute: 0, status: "Security Check", location: "Dubai, UAE", flag: "AE", activityText: "Routine security screening completed." },
    { dayOffset: 45, hour: 9, minute: 0, status: "Departed UAE, Dubai", location: "Dubai, UAE", flag: "AE", activityText: "Parcel departed Dubai on flight to Nairobi." },
    { dayOffset: 46, hour: 9, minute: 0, status: "In Transit", location: "Over Indian Ocean", flag: "AE", activityText: "Parcel in transit to Nairobi." },
    { dayOffset: 48, hour: 9, minute: 0, status: "Arrived Kenya, Nairobi", location: "Nairobi, Kenya", flag: "KE", activityText: "Parcel arrived at Jomo Kenyatta Airport." },
    { dayOffset: 50, hour: 9, minute: 0, status: "At Transit Hub", location: "Nairobi, Kenya", flag: "KE", activityText: "Parcel transferred to regional transit facility." },
    { dayOffset: 52, hour: 9, minute: 0, status: "Awaiting Connection", location: "Nairobi, Kenya", flag: "KE", activityText: "Awaiting connecting flight to Johannesburg." },
    { dayOffset: 54, hour: 9, minute: 0, status: "Flight Delayed", location: "Nairobi, Kenya", flag: "KE", activityText: "Connecting flight delayed." },
    { dayOffset: 56, hour: 9, minute: 0, status: "Rebooked", location: "Nairobi, Kenya", flag: "KE", activityText: "Parcel rebooked on next available flight." },
    { dayOffset: 58, hour: 9, minute: 0, status: "Documentation", location: "Nairobi, Kenya", flag: "KE", activityText: "Export documentation for South Africa submitted." },
    { dayOffset: 60, hour: 9, minute: 0, status: "Departed Kenya", location: "Nairobi, Kenya", flag: "KE", activityText: "Parcel departed Nairobi on flight to Johannesburg." },
    { dayOffset: 61, hour: 9, minute: 0, status: "In Transit", location: "Over Southern Africa", flag: "KE", activityText: "Parcel in transit to Johannesburg." },
    { dayOffset: 63, hour: 9, minute: 0, status: "Arrived South Africa, Johannesburg", location: "Johannesburg, SA", flag: "ZA", activityText: "Parcel arrived at OR Tambo International Airport." },
    { dayOffset: 65, hour: 9, minute: 0, status: "At Import Hub", location: "Johannesburg, SA", flag: "ZA", activityText: "Parcel transferred to SARS import facility." },
    { dayOffset: 67, hour: 9, minute: 0, status: "Customs Processing", location: "Johannesburg, SA", flag: "ZA", activityText: "Import documentation submitted for customs review." },
    { dayOffset: 69, hour: 9, minute: 0, status: "Customs Review", location: "Johannesburg, SA", flag: "ZA", activityText: "Customs review in progress." },
    { dayOffset: 71, hour: 9, minute: 0, status: "Duty Assessed", location: "Johannesburg, SA", flag: "ZA", activityText: "Customs duty assessed. Awaiting payment." },
    { dayOffset: 73, hour: 9, minute: 0, status: "Duty Paid", location: "Johannesburg, SA", flag: "ZA", activityText: "Customs duty payment received. Parcel released." },
    { dayOffset: 75, hour: 9, minute: 0, status: "Cleared Customs", location: "Johannesburg, SA", flag: "ZA", activityText: "Parcel cleared for domestic delivery." },
    { dayOffset: 76, hour: 9, minute: 0, status: "At National Hub", location: "Johannesburg, SA", flag: "ZA", activityText: "Parcel arrived at national distribution hub." },
    { dayOffset: 78, hour: 9, minute: 0, status: "Sorting", location: "Johannesburg, SA", flag: "ZA", activityText: "Parcel sorted for regional transfer." },
    { dayOffset: 80, hour: 9, minute: 0, status: "In Transit", location: "Regional Hub", flag: "ZA", activityText: "Parcel in transit to regional distribution center." },
    { dayOffset: 82, hour: 9, minute: 0, status: "At Regional Hub", location: "Regional Hub", flag: "ZA", activityText: "Parcel arrived at regional hub." },
    { dayOffset: 83, hour: 9, minute: 0, status: "Local Dispatch", location: "Local Depot", flag: "ZA", activityText: "Parcel dispatched to local delivery depot." },
    { dayOffset: 84, hour: 9, minute: 0, status: "At Local Depot", location: destination, flag: destinationFlag, activityText: "Parcel arrived at local delivery depot." },
    { dayOffset: 86, hour: 9, minute: 0, status: "Out for Delivery", location: destination, flag: destinationFlag, activityText: "Parcel out for delivery. Driver assigned." },
    { dayOffset: 88, hour: 9, minute: 0, status: "Delivery Attempted", location: destination, flag: destinationFlag, activityText: "Delivery attempted. No one available." },
    { dayOffset: 90, hour: 9, minute: 0, status: "Redelivery Scheduled", location: destination, flag: destinationFlag, activityText: "Redelivery scheduled for next available slot." },
    { dayOffset: 92, hour: 9, minute: 0, status: "Out for Delivery", location: destination, flag: destinationFlag, activityText: "Second delivery attempt." },
    { dayOffset: 94, hour: 9, minute: 0, status: "Delivery Attempted", location: destination, flag: destinationFlag, activityText: "Delivery attempted. Address inaccessible." },
    { dayOffset: 96, hour: 9, minute: 0, status: "Held at Depot", location: destination, flag: destinationFlag, activityText: "Parcel held at depot. Awaiting instructions." },
    { dayOffset: 98, hour: 9, minute: 0, status: "Investigation", location: destination, flag: destinationFlag, activityText: "Parcel under review." },
    { dayOffset: 100, hour: 9, minute: 0, status: "Parcel Located", location: destination, flag: destinationFlag, activityText: "Parcel located. Rescheduled for delivery." },
    { dayOffset: 102, hour: 9, minute: 0, status: "Out for Delivery", location: destination, flag: destinationFlag, activityText: "Final delivery attempt." },
    { dayOffset: 105, hour: 9, minute: 0, status: "Delivered", location: destination, flag: destinationFlag, activityText: "Parcel delivered. Signature on file." },
    { dayOffset: 107, hour: 9, minute: 0, status: "Dispute Window", location: destination, flag: destinationFlag, activityText: "Dispute window open for 48 hours." },
    { dayOffset: 110, hour: 9, minute: 0, status: "Case Closed", location: destination, flag: destinationFlag, activityText: "Delivery confirmed. Case closed." },
  ];
}


function formatDateLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} · ${hours}:${minutes}`;
}

function formatStartDateLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

const MINUTES_IN_DAY = 24 * 60;

function randomizeOffsets(schedule: ScheduleStep[], startAt: Date): ScheduleStep[] {
  let day = 0;
  let prevMinutes = startAt.getUTCHours() * 60 + startAt.getUTCMinutes();

  return schedule.map((step, index) => {
    
    if (index === 0) {
      return {
        ...step,
        dayOffset: 0,
        hour: startAt.getUTCHours(),
        minute: startAt.getUTCMinutes(),
      };
    }

    
    const shareDay =
      index > 1 && prevMinutes < MINUTES_IN_DAY - 1 && Math.random() < 0.2;

    let minutesOfDay: number;
    if (shareDay) {
      
      minutesOfDay =
        prevMinutes + 1 + Math.floor(Math.random() * (MINUTES_IN_DAY - 1 - prevMinutes));
    } else {
      day += Math.random() < 0.5 ? 1 : 2;
      minutesOfDay = Math.floor(Math.random() * MINUTES_IN_DAY);
    }

    prevMinutes = minutesOfDay;
    return {
      ...step,
      dayOffset: day,
      hour: Math.floor(minutesOfDay / 60),
      minute: minutesOfDay % 60,
    };
  });
}



function spreadDates(count: number, startAt: Date, endAt: Date): Date[] {
  const span = endAt.getTime() - startAt.getTime();
  const middle = Array.from({ length: Math.max(count - 2, 0) }, () => Math.random()).sort((a, b) => a - b);
  return [0, ...middle, 1].map((fraction) => {
    const date = new Date(startAt.getTime() + Math.round(fraction * span));
    date.setUTCSeconds(0, 0);
    return date;
  });
}

function events(
  destination: string,
  destinationFlag: string,
  startAt: Date,
  endAt?: Date | null,
): ShipmentActivity[] {
  const baseSchedule = buildSchedule(destination, destinationFlag);
  const hasRange = !!endAt && endAt.getTime() > startAt.getTime();

  if (hasRange) {
    const dates = spreadDates(baseSchedule.length, startAt, endAt!);
    return baseSchedule.map((step, index) => ({
      dayNumber: Math.floor((dates[index].getTime() - startAt.getTime()) / 86_400_000),
      status: step.status,
      location: step.location,
      flag: step.flag,
      activityText: step.activityText,
      dateLabel: formatDateLabel(dates[index]),
    }));
  }

 
  const schedule = randomizeOffsets(baseSchedule, startAt);
  return schedule.map((step) => {
    const eventDate = new Date(startAt);
    eventDate.setUTCDate(eventDate.getUTCDate() + step.dayOffset);
    eventDate.setUTCHours(step.hour, step.minute, 0, 0);

    return {
      dayNumber: step.dayOffset,
      status: step.status,
      location: step.location,
      flag: step.flag,
      activityText: step.activityText,
      dateLabel: formatDateLabel(eventDate),
    };
  });
}


function buildSeedShipment(
  overrides: {
    trackingNumber: string;
    recipientName: string;
    deliveryAddress: string;
    townCity: string;
    itemsOrdered: string[];
    carrierLabel: string;
  },
  destination: string,
  destinationFlag: string,
  startAt: Date,
  demoStepIndex: number,
): ShipmentPayload {
  const activityLog = events(destination, destinationFlag, startAt);
  const matchedStep = activityLog[demoStepIndex] ?? activityLog[0];

  return {
    ...overrides,
    startDate: formatStartDateLabel(startAt),
    demoDay: matchedStep.dayNumber,
    currentStatus: matchedStep.status,
    currentLocation: matchedStep.location,
    currentFlag: matchedStep.flag,
    activityLog,
  };
}

function getSeedShipments(): ShipmentPayload[] {
  const seedStartAt = new Date();

  return [
    buildSeedShipment(
      {
        trackingNumber: "773G63H12K53",
        recipientName: "Mr. J. van der Merwe",
        deliveryAddress: "Plot 44, Rietfontein Farm",
        townCity: "Bloemfontein",
        itemsOrdered: ["Starlink Mounting Kit", "Backup Power Unit", "10m Cable"],
        carrierLabel: "Maersk Air Cargo",
      },
      "Bloemfontein, South Africa",
      "ZA",
      seedStartAt,
      2,
    ),
    buildSeedShipment(
      {
        trackingNumber: "6F2K9D1L47P7",
        recipientName: "Lindiwe Mokoena",
        deliveryAddress: "18 Olive Grove",
        townCity: "Cape Town",
        itemsOrdered: ["Field Router", "Weatherproof Case"],
        carrierLabel: "Qatar Airways Cargo",
      },
      "Cape Town, South Africa",
      "ZA",
      seedStartAt,
      3,
    ),
    buildSeedShipment(
      {
        trackingNumber: "50872Q01B29Z",
        recipientName: "Rafael Santos",
        deliveryAddress: "7 Garden Walk",
        townCity: "Durban",
        itemsOrdered: ["Solar Charge Controller"],
        carrierLabel: "Emirates SkyCargo",
      },
      "Durban, South Africa",
      "ZA",
      seedStartAt,
      8,
    ),
  ];
}

function serializeShipment(shipment: typeof shipmentsTable.$inferSelect) {
  return {
    ...shipment,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  };
}

async function resetSeedShipments() {
  await db.delete(shipmentsTable);
  return db
    .insert(shipmentsTable)
    .values(getSeedShipments())
    .returning();
}

router.get("/shipments", requireAdmin, async (req, res) => {
  try {
    const shipments = await db
      .select()
      .from(shipmentsTable)
      .orderBy(desc(shipmentsTable.updatedAt));
    res.json(shipments.map(serializeShipment));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list shipments");
    res.status(500).json({ error: "Unable to load shipments." });
  }
});

function parseTimeInput(input: unknown): { hours: number; minutes: number } | null {
  if (typeof input !== "string") return null;
  const match = input.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return match ? { hours: Number(match[1]), minutes: Number(match[2]) } : null;
}

function parseDateInput(input: unknown, now: Date, timeInput?: unknown): Date | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const value = input.trim();
  let day: Date | null = null;

 
  const monthDay = value.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (monthDay) {
    day = new Date(Date.UTC(now.getUTCFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2])));
  } else {

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      day = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    }
  }

  if (!day) return null;

   const time = parseTimeInput(timeInput);
   day.setUTCHours(time?.hours ?? now.getUTCHours(), time?.minutes ?? now.getUTCMinutes(), 0, 0);
   return day;
 }
 
 function parseStartDate(input: unknown, now: Date, timeInput?: unknown): Date {
   return parseDateInput(input, now, timeInput) ?? now;
 }
 
 function formatStartTime(date: Date): string {
   return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
 }

router.post("/shipments", requireAdmin, async (req, res) => {
  try {
    const body = CreateShipmentBody.parse(req.body);
    const now = new Date();
    const rawBody = req.body as { startDate?: unknown; startTime?: unknown };
    const chosenStart = parseStartDate(rawBody?.startDate, now, rawBody?.startTime);
    const startAt = chosenStart < now ? now : chosenStart;
    

    const destination = `${body.townCity}, South Africa`;
    const destinationFlag = "ZA";
    const activityLog = events(destination, destinationFlag, startAt);
    const firstStep = activityLog[0];

    req.log.info(
      { startAt: startAt.toISOString(), first: firstStep.dateLabel },
      "shipment schedule built (v3)",
    );

    const [shipment] = await db
      .insert(shipmentsTable)
      .values({
        ...body,
        trackingNumber: body.trackingNumber.toUpperCase(),
        startDate: formatStartDateLabel(startAt),
        startTime: formatStartTime(startAt),
        currentStatus: firstStep.status,
       
        currentLocation: firstStep.location,
        currentFlag: firstStep.flag,
        demoDay: firstStep.dayNumber,
        activityLog,
      })
      .returning();

    res.status(201).json(serializeShipment(shipment));
  } catch (error) {
    if (isDuplicateTrackingNumber(error)) {
      res.status(409).json({ error: "That tracking number is already in use." });
      return;
    }
    if (isValidationError(error)) {
      res.status(400).json({ error: "Shipment details are incomplete or invalid." });
      return;
    }
    req.log.error({ err: error }, "Failed to create shipment");
    res.status(500).json({ error: "Unable to create shipment." });
  }
});

router.post("/shipments/reset", requireAdmin, async (req, res) => {
  try {
    const shipments = await resetSeedShipments();
    res.json(shipments.map(serializeShipment));
  } catch (error) {
    req.log.error({ err: error }, "Failed to reset shipments");
    res.status(500).json({ error: "Unable to reset demo shipments." });
  }
});

router.get("/shipments/summary", requireAdmin, async (req, res) => {
  try {
    const shipments = await db.select().from(shipmentsTable).orderBy(desc(shipmentsTable.updatedAt));
    const countBy = (matcher: (status: string) => boolean) =>
      shipments.filter((shipment) => matcher(shipment.currentStatus.toLowerCase())).length;
    res.json({
      total: shipments.length,
      inTransit: countBy((status) => status.includes("transit")),
      pending: countBy((status) => status.includes("pending") || status.includes("hub")),
      delivered: countBy((status) => status.includes("delivered")),
      recent: shipments.slice(0, 5).map(serializeShipment),
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to load shipment summary");
    res.status(500).json({ error: "Unable to load shipment summary." });
  }
});

router.get("/shipments/:trackingNumber", async (req, res) => {
  try {
    const { trackingNumber } = GetShipmentParams.parse(req.params);
    const [shipment] = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.trackingNumber, trackingNumber.toUpperCase()));

    if (!shipment) {
      res.status(404).json({ error: "Shipment not found." });
      return;
    }
    res.json(serializeShipment(shipment));
  } catch (error) {
    if (isValidationError(error)) {
      res.status(400).json({ error: "Tracking number must be 12 characters." });
      return;
    }
    req.log.error({ err: error }, "Failed to load shipment");
    res.status(500).json({ error: "Unable to load shipment." });
  }
});

router.patch("/shipments/:trackingNumber", requireAdmin, async (req, res) => {
  try {
    const { trackingNumber } = DeleteShipmentParams.parse(req.params);
    const updates = UpdateShipmentBody.parse(req.body);
    const [shipment] = await db
      .update(shipmentsTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(shipmentsTable.trackingNumber, trackingNumber.toUpperCase()))
      .returning();

    if (!shipment) {
      res.status(404).json({ error: "Shipment not found." });
      return;
    }
    res.json(serializeShipment(shipment));
  } catch (error) {
    if (isValidationError(error)) {
      res.status(400).json({ error: "Shipment updates are incomplete or invalid." });
      return;
    }
    req.log.error({ err: error }, "Failed to update shipment");
    res.status(500).json({ error: "Unable to update shipment." });
  }
});

router.delete("/shipments/:trackingNumber", requireAdmin, async (req, res) => {
  try {
    const { trackingNumber } = UpdateShipmentParams.parse(req.params);
    const deleted = await db
      .delete(shipmentsTable)
      .where(eq(shipmentsTable.trackingNumber, trackingNumber.toUpperCase()))
      .returning({ id: shipmentsTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Shipment not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    if (isValidationError(error)) {
      res.status(400).json({ error: "Tracking number must be 12 characters." });
      return;
    }
    req.log.error({ err: error }, "Failed to delete shipment");
    res.status(500).json({ error: "Unable to delete shipment." });
  }
});

function isDuplicateTrackingNumber(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function isValidationError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "ZodError";
}

export default router;