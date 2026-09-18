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

const router: IRouter = Router();

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
    {
      dayOffset: 0,
      hour: 10,
      minute: 15,
      status: "Order picked up from supplier",
      location: "Austin, United States",
      flag: "US",
      activityText: "Order picked up from supplier.",
    },
    {
      dayOffset: 1,
      hour: 18,
      minute: 40,
      status: "Departed from Austin, USA",
      location: "Austin, United States",
      flag: "US",
      activityText: "Departed Austin distribution centre.",
    },
    {
      dayOffset: 4,
      hour: 9,
      minute: 20,
      status: "Arrived at Frankfurt hub",
      location: "Frankfurt, Germany",
      flag: "DE",
      activityText: "Arrived at Frankfurt hub.",
    },
    {
      dayOffset: 5,
      hour: 14,
      minute: 10,
      status: "Departed Frankfurt hub",
      location: "Frankfurt, Germany",
      flag: "DE",
      activityText: "Departed Frankfurt hub.",
    },
    {
      dayOffset: 7,
      hour: 5,
      minute: 35,
      status: "Arrived at Dubai hub",
      location: "Dubai, United Arab Emirates",
      flag: "AE",
      activityText: "Arrived at Dubai hub.",
    },
    {
      dayOffset: 7,
      hour: 22,
      minute: 50,
      status: "Departed Dubai",
      location: "Dubai, United Arab Emirates",
      flag: "AE",
      activityText: "Departed Dubai hub.",
    },
    {
      dayOffset: 10,
      hour: 11,
      minute: 15,
      status: "Arrived in South Africa",
      location: destination,
      flag: destinationFlag,
      activityText: "Arrived in South Africa.",
    },
    {
      dayOffset: 11,
      hour: 8,
      minute: 30,
      status: "Out for delivery",
      location: destination,
      flag: destinationFlag,
      activityText: "Shipment is out for delivery.",
    },
    {
      dayOffset: 11,
      hour: 15,
      minute: 45,
      status: "Delivered",
      location: destination,
      flag: destinationFlag,
      activityText: "Shipment delivered.",
    },
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

function events(destination: string, destinationFlag: string, startAt: Date): ShipmentActivity[] {
  const schedule = buildSchedule(destination, destinationFlag);

  return schedule.map((step, index) => {
    const eventDate = new Date(startAt);
    eventDate.setUTCDate(eventDate.getUTCDate() + step.dayOffset);
    eventDate.setUTCHours(step.hour, step.minute, 0, 0);

    return {
      dayNumber: index + 1,
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

const seedStartAt = new Date();

const seedShipments: ShipmentPayload[] = [
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
    .values(seedShipments)
    .returning();
}

router.get("/shipments", async (req, res) => {
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

router.post("/shipments", async (req, res) => {
  try {
    const body = CreateShipmentBody.parse(req.body);
    const startAt = new Date();
    const destination = `${body.townCity}, South Africa`;
    const destinationFlag = "ZA";
    const activityLog = events(destination, destinationFlag, startAt);
    const firstStep = activityLog[0];

    const [shipment] = await db
      .insert(shipmentsTable)
      .values({
        ...body,
        trackingNumber: body.trackingNumber.toUpperCase(),
        startDate: formatStartDateLabel(startAt),
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

router.post("/shipments/reset", async (req, res) => {
  try {
    const shipments = await resetSeedShipments();
    res.json(shipments.map(serializeShipment));
  } catch (error) {
    req.log.error({ err: error }, "Failed to reset shipments");
    res.status(500).json({ error: "Unable to reset demo shipments." });
  }
});

router.get("/shipments/summary", async (req, res) => {
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

router.patch("/shipments/:trackingNumber", async (req, res) => {
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

router.delete("/shipments/:trackingNumber", async (req, res) => {
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