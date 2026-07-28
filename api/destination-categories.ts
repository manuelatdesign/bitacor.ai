import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "node:module";

/**
 * Load pre-built handlers so Vercel does not bundle @cursor/sdk (crashes with
 * FUNCTION_INVOCATION_FAILED). Built in `npm run build` → api/_handlers.cjs.
 */
const require = createRequire(import.meta.url);
const { handleDestinationCategories } = require("./_handlers.cjs") as {
  handleDestinationCategories: (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return handleDestinationCategories(req, res);
}
