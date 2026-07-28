import type { VercelRequest, VercelResponse } from "@vercel/node";
import { autocompleteCities } from "../../server/cityAutocomplete";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const result = await autocompleteCities(q);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[api/places/autocomplete]", err);
    return res.status(500).json({
      suggestions: [],
      source: "none",
      warning: err?.message || "Error",
    });
  }
}
