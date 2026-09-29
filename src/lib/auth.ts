import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is not set");
const JWT_SECRET: string = secret;

export function signToken(adminId: number, email: string) {
  return jwt.sign({ email }, JWT_SECRET, { subject: String(adminId), expiresIn: "12h" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    res.locals.adminId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: "Please sign in." });
  }
}