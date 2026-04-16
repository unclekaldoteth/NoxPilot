import { NextResponse } from "next/server";
import { ResearchRankRequestSchema, ResearchRankResponseSchema } from "@noxpilot/shared";
import { buildAgentResponseHeaders, fetchAgentJson } from "@/lib/agent-server";
import { devMocksEnabled } from "@/lib/env";
import { buildMockRankResponse } from "@/lib/mock-agent";

export async function POST(request: Request) {
  const json = await request.json();
  const payload = ResearchRankRequestSchema.parse(json);
  const agentResponse = await fetchAgentJson("/research/rank", payload);

  if (agentResponse.ok) {
    return NextResponse.json(ResearchRankResponseSchema.parse(agentResponse.payload), {
      headers: buildAgentResponseHeaders("agent")
    });
  }

  if (devMocksEnabled) {
    return NextResponse.json(
      ResearchRankResponseSchema.parse(buildMockRankResponse(payload.whitelist, payload.portfolio_bias, payload.candidates)),
      {
        headers: buildAgentResponseHeaders("mock")
      }
    );
  }

  return NextResponse.json({ error: agentResponse.message }, { status: agentResponse.status });
}
