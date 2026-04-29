import { NextResponse } from "next/server";
import { AgentHealthResponseSchema } from "@noxpilot/shared";
import { fetchAgentHealthJson } from "@/lib/agent-server";

export async function GET() {
  const agentResponse = await fetchAgentHealthJson();

  if (agentResponse.ok) {
    return NextResponse.json(AgentHealthResponseSchema.parse(agentResponse.payload), {
      headers: {
        "x-noxpilot-agent-source": "agent"
      }
    });
  }

  return NextResponse.json(
    {
      error: agentResponse.message,
      reason: agentResponse.reason
    },
    { status: agentResponse.status }
  );
}
