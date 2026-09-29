import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, adminsTable, passwordResetsTable } from "@workspace/db";
import { requireAdmin, signToken } from "../lib/auth";
import { sendOtpEmail } from "../lib/mailer";


const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  try {
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
    const ok = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !ok) {
      res.status(401).json({ error: "Incorrect email or password." });
      return;
    }
    res.json({ token: signToken(admin.id, admin.email), email: admin.email });
  } catch (err) {
    console.error("login failed:", err);
    res.status(500).json({ error: "Login failed." });
  }
});

router.post("/auth/change-password", requireAdmin, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? "");
  const newPassword = String(req.body?.newPassword ?? "");
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters." });
    return;
  }
  try {
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, res.locals.adminId)).limit(1);
    if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(adminsTable).set({ passwordHash, updatedAt: new Date() }).where(eq(adminsTable.id, admin.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("change-password failed:", err);
    res.status(500).json({ error: "Could not update password." });
  }
});



router.post("/auth/forgot-password", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }
    try {
        const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
        if (!admin) {
          res.status(404).json({ error: "No admin account found with that email." });
          return;
        }
        const otp = String(randomInt(100000, 1000000));
        const otpHash = await bcrypt.hash(otp, 10);
        await db.delete(passwordResetsTable).where(eq(passwordResetsTable.adminId, admin.id));
        await db.insert(passwordResetsTable).values({
          adminId: admin.id,
          otpHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        await sendOtpEmail(admin.email, otp);
        res.json({ ok: true });
    } catch (err) {
      console.error("forgot-password failed:", err);
      res.status(500).json({ error: "Could not send reset code." });
    }
  });
  
  router.post("/auth/reset-password", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const otp = String(req.body?.otp ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "");
    if (!email || !otp) {
      res.status(400).json({ error: "Email and code are required." });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters." });
      return;
    }
    try {
      const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
      const [reset] = admin
        ? await db.select().from(passwordResetsTable).where(eq(passwordResetsTable.adminId, admin.id)).limit(1)
        : [];
  
      if (!admin || !reset || reset.expiresAt < new Date() || reset.attempts >= 5) {
        res.status(400).json({ error: "Invalid or expired code." });
        return;
      }
  
      if (!(await bcrypt.compare(otp, reset.otpHash))) {
        await db
          .update(passwordResetsTable)
          .set({ attempts: sql`${passwordResetsTable.attempts} + 1` })
          .where(eq(passwordResetsTable.id, reset.id));
        res.status(400).json({ error: "Invalid or expired code." });
        return;
      }
  
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.update(adminsTable).set({ passwordHash, updatedAt: new Date() }).where(eq(adminsTable.id, admin.id));
      await db.delete(passwordResetsTable).where(eq(passwordResetsTable.adminId, admin.id));
      res.json({ ok: true });
    } catch (err) {
      console.error("reset-password failed:", err);
      res.status(500).json({ error: "Could not reset password." });
    }
  });
  
  export default router;
