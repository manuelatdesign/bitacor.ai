/**
 * Vercel serverless entry: hand the request to the Express app.
 * Export the app directly — wrapping it in a Promise that waits for `next`
 * hangs forever after a matched route sends a response (FUNCTION_INVOCATION_FAILED).
 */
import app from "../server";

export default app;
