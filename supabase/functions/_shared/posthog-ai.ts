import { GoogleGenAI } from "npm:@posthog/ai/gemini";
import { PostHog } from "npm:posthog-node";

const projectToken = Deno.env.get("POSTHOG_PROJECT_TOKEN");
const host = Deno.env.get("POSTHOG_HOST");
const isProduction =
  Deno.env.get("ENVIRONMENT") === "production" ||
  Deno.env.get("NODE_ENV") === "production";

if (!projectToken && !isProduction) {
  console.warn(
    "POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured"
  );
}

if (!host && !isProduction) {
  console.warn(
    "POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured"
  );
}

export const posthog =
  projectToken && host
    ? new PostHog(projectToken, {
        host,
        privacyMode: false,
        enableExceptionAutocapture: false,
        flushAt: 1,
        flushInterval: 0,
        requestTimeout: 2000,
        fetchRetryCount: 0,
      })
    : undefined;

export type AiGenerationContext = {
  posthogTraceId: string;
  posthogProperties: { $ai_session_id: string };
  posthogDistinctId?: string;
};

export function createGeminiClient(apiKey: string) {
  return new GoogleGenAI({
    apiKey,
    ...(posthog ? { posthog } : {}),
  });
}

export function createAiGenerationContext(
  sessionId?: unknown,
  distinctId?: string
): AiGenerationContext {
  const safeSessionId =
    typeof sessionId === "string" &&
    /^[A-Za-z0-9_~.@()!'|:-]+$/.test(sessionId)
      ? sessionId
      : crypto.randomUUID();

  return {
    posthogTraceId: crypto.randomUUID(),
    posthogProperties: { $ai_session_id: safeSessionId },
    ...(distinctId ? { posthogDistinctId: distinctId } : {}),
  };
}

export async function flushPostHog() {
  if (posthog) {
    await posthog.flush().catch(() => {});
  }
}
