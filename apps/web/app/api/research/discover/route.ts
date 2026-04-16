import { NextResponse } from "next/server";
import { TokenDiscoveryRequestSchema, TokenDiscoveryResponseSchema } from "@noxpilot/shared";
import { buildAgentResponseHeaders, fetchAgentJson } from "@/lib/agent-server";
import { devMocksEnabled } from "@/lib/env";
import { buildMockDiscoveryResponse } from "@/lib/mock-agent";

export async function POST(request: Request) {
  const json = await request.json();
  const payload = TokenDiscoveryRequestSchema.parse(json);
  const agentResponse = await fetchAgentJson("/research/discover", payload);

  if (agentResponse.ok) {
    return NextResponse.json(TokenDiscoveryResponseSchema.parse(agentResponse.payload), {
      headers: buildAgentResponseHeaders("agent")
    });
  }

  if (devMocksEnabled) {
    return NextResponse.json(TokenDiscoveryResponseSchema.parse(buildMockDiscoveryResponse(payload)), {
      headers: buildAgentResponseHeaders("mock")
    });
  }

  return NextResponse.json({ error: agentResponse.message }, { status: agentResponse.status });
}
