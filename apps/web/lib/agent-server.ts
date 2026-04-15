export type AgentResponseSource = "agent" | "mock";
export type AgentFailureReason = "not-configured" | "unreachable" | "invalid-response";

const AGENT_TIMEOUT_MS = 8000;

export function resolveAgentBaseUrl() {
  const candidate =
    process.env.NEXT_PUBLIC_AGENT_BASE_URL ||
    process.env.AGENT_BASE_URL ||
    process.env.NEXT_PUBLIC_AGENT_URL ||
    process.env.AGENT_URL ||
    "";

  return candidate.replace(/\/+$/, "");
}

export function buildAgentResponseHeaders(source: AgentResponseSource) {
  const headers = new Headers({
    "x-noxpilot-agent-source": source
  });

  return headers;
}

export async function fetchAgentJson(path: string, body: unknown) {
  const agentBaseUrl = resolveAgentBaseUrl();
  if (!agentBaseUrl) {
    return {
      ok: false as const,
      reason: "not-configured" as const,
      status: 500,
      message: "NEXT_PUBLIC_AGENT_BASE_URL is not configured.",
      payload: null
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const response = await fetch(`${agentBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false as const,
        reason: "invalid-response" as const,
        status: response.status,
        message: errorText || `Research agent request failed with ${response.status}.`,
        payload: null
      };
    }

    return {
      ok: true as const,
      payload: await response.json()
    };
  } catch {
    return {
      ok: false as const,
      reason: "unreachable" as const,
      status: 503,
      message: "Research agent is unreachable.",
      payload: null
    };
  } finally {
    clearTimeout(timeout);
  }
}
