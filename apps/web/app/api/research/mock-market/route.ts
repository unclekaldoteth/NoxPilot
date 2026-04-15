import { NextResponse } from "next/server";
import { ResearchMockMarketRequestSchema, ResearchMockMarketResponseSchema } from "@noxpilot/shared";
import { buildAgentResponseHeaders, fetchAgentJson } from "@/lib/agent-server";
import { devMocksEnabled } from "@/lib/env";
import { buildMockMarketSignals } from "@/lib/mock-agent";

export async function POST(request: Request) {
  const json = await request.json();
  const payload = ResearchMockMarketRequestSchema.parse(json);
  const agentResponse = await fetchAgentJson("/research/mock-market", payload);

  if (agentResponse.ok) {
    return NextResponse.json(ResearchMockMarketResponseSchema.parse(agentResponse.payload), {
      headers: buildAgentResponseHeaders("agent")
    });
  }

  if (devMocksEnabled) {
    return NextResponse.json(
      ResearchMockMarketResponseSchema.parse({
        generatedAt: new Date().toISOString(),
        signals: buildMockMarketSignals(payload.whitelist)
      }),
      {
        headers: buildAgentResponseHeaders("mock")
      }
    );
  }

  return NextResponse.json({ error: agentResponse.message }, { status: agentResponse.status });
}
