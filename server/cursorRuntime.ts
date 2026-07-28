/** Cursor Agent.prompt runtime: local dev vs Vercel serverless (cloud, no repo). */

export function isVercelServerless(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

export function agentPromptRuntime(name: string): Record<string, unknown> {
  const modelId = process.env.CURSOR_MODEL || "composer-2.5";
  const base = {
    model: { id: modelId },
    name,
  };

  if (isVercelServerless()) {
    // Local SDK runtime needs native binaries — unavailable in Vercel lambdas.
    return { ...base, cloud: {} };
  }

  return { ...base, local: { cwd: process.cwd() } };
}
