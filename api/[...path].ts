import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";

let app: Express | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    const mod = await import("../server.js");
    app = mod.default;
  }

  return new Promise<void>((resolve, reject) => {
    app!(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
