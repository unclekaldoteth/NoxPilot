import { NextResponse } from "next/server";
import { ResearchExplainRequestSchema, ResearchExplainResponseSchema } from "@noxpilot/shared";
import { buildAgentResponseHeaders, fetchAgentJson } from "@/lib/agent-server";
import { devMocksEnabled } from "@/lib/env";
import { buildMockExplainResponse } from "@/lib/mock-agent";

export async function POST(request: Request) {
  const json = await request.json();
  const payload = ResearchExplainRequestSchema.parse(json);
  const agentResponse = await fetchAgentJson("/research/explain", payload);

  if (agentResponse.ok) {
    return NextResponse.json(ResearchExplainResponseSchema.parse(agentResponse.payload), {
      headers: buildAgentResponseHeaders("agent")
    });
  }

  if (devMocksEnabled) {
    return NextResponse.json(ResearchExplainResponseSchema.parse(buildMockExplainResponse(payload)), {
      headers: buildAgentResponseHeaders("mock")
    });
  }

  return NextResponse.json({ error: agentResponse.message }, { status: agentResponse.status });
}
