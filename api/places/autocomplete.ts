import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handlePlacesAutocomplete } from "../../server/apiHandlers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return handlePlacesAutocomplete(req, res);
}
