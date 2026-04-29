export type AgentResponseSource = "agent" | "mock";
export type AgentFailureReason = "not-configured" | "unreachable" | "invalid-response" | "timeout";

const AGENT_TIMEOUT_MS = 12000;

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
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Research agent request timed out."
        : "Research agent is unreachable.";

    return {
      ok: false as const,
      reason: error instanceof Error && error.name === "AbortError" ? ("timeout" as const) : ("unreachable" as const),
      status: 503,
      message,
      payload: null
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAgentHealthJson() {
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
    const response = await fetch(`${agentBaseUrl}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false as const,
        reason: "invalid-response" as const,
        status: response.status,
        message: errorText || `Research agent health check failed with ${response.status}.`,
        payload: null
      };
    }

    return {
      ok: true as const,
      payload: await response.json()
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Research agent health check timed out."
        : "Research agent is unreachable.";

    return {
      ok: false as const,
      reason: error instanceof Error && error.name === "AbortError" ? ("timeout" as const) : ("unreachable" as const),
      status: 503,
      message,
      payload: null
    };
  } finally {
    clearTimeout(timeout);
  }
}
