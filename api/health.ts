import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Lightweight probe for production routing. */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    ok: true,
    service: "bitacor-ai",
    time: new Date().toISOString(),
  });
}
