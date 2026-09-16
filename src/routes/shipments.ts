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

function events(destination: string, destinationFlag: string): ShipmentActivity[] {
  return [
    {
      dayNumber: 1,
      status: "Order placed",
      location: "Austin, United States",
      flag: "US",
      activityText: "Order packed by supplier.",
      dateLabel: "02 Aug 2026 · 10:15",
    },
    {
      dayNumber: 2,
      status: "Departed origin",
      location: "Austin, United States",
      flag: "US",
      activityText: "Departed Austin distribution centre.",
      dateLabel: "03 Aug 2026 · 18:40",
    },
    {
      dayNumber: 3,
      status: "In transit",
      location: "Frankfurt, Germany",
      flag: "DE",
      activityText: "Arrived at Frankfurt hub.",
      dateLabel: "10 Aug 2026 · 16:55",
    },
    {
      dayNumber: 4,
      status: "At destination hub",
      location: destination,
      flag: destinationFlag,
      activityText: "Arrived at destination hub.",
      dateLabel: "12 Aug 2026 · 09:40",
    },
    {
      dayNumber: 5,
      status: "Delivered",
      location: destination,
      flag: destinationFlag,
      activityText: "Shipment delivered. Demo confirmation recorded.",
      dateLabel: "15 Aug 2026 · 08:20",
    },
  ];
}

const seedShipments: ShipmentPayload[] = [
  {
    trackingNumber: "773G63H12K53",
    recipientName: "Mr. J. van der Merwe",
    deliveryAddress: "Plot 44, Rietfontein Farm",
    townCity: "Bloemfontein",
    itemsOrdered: ["Starlink Mounting Kit", "Backup Power Unit", "10m Cable"],
    carrierLabel: "Maersk Air Cargo",
    startDate: "02 Aug 2026",
    currentStatus: "In transit",
    currentLocation: "Frankfurt, Germany",
    currentFlag: "DE",
    demoDay: 3,
    activityLog: events("Bloemfontein, South Africa", "ZA"),
  },
  {
    trackingNumber: "6F2K9D1L47P7",
    recipientName: "Lindiwe Mokoena",
    deliveryAddress: "18 Olive Grove",
    townCity: "Cape Town",
    itemsOrdered: ["Field Router", "Weatherproof Case"],
    carrierLabel: "Qatar Airways Cargo",
    startDate: "06 Aug 2026",
    currentStatus: "Pending",
    currentLocation: "Johannesburg, South Africa",
    currentFlag: "ZA",
    demoDay: 4,
    activityLog: events("Cape Town, South Africa", "ZA"),
  },
  {
    trackingNumber: "50872Q01B29Z",
    recipientName: "Rafael Santos",
    deliveryAddress: "7 Garden Walk",
    townCity: "Durban",
    itemsOrdered: ["Solar Charge Controller"],
    carrierLabel: "Emirates SkyCargo",
    startDate: "09 Aug 2026",
    currentStatus: "Delivered",
    currentLocation: "Durban, South Africa",
    currentFlag: "ZA",
    demoDay: 5,
    activityLog: events("Durban, South Africa", "ZA"),
  },
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
    const [shipment] = await db
      .insert(shipmentsTable)
      .values({
        ...body,
        trackingNumber: body.trackingNumber.toUpperCase(),
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