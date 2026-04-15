import { NextResponse } from "next/server";
import { createNoxClient, encryptBool, encryptUint256 } from "@noxpilot/nox-sdk";
import {
  EncryptedPolicyPayloadSchema,
  PrivatePolicyInputSchema,
  type EncryptedPolicyPayload
} from "@noxpilot/shared";
import { devMocksEnabled } from "@/lib/env";

export async function POST(request: Request) {
  if (!devMocksEnabled) {
    return NextResponse.json(
      {
        error:
          "Server-side policy encryption is disabled for the live judged flow. Use the wallet-backed client path instead."
      },
      { status: 400 }
    );
  }

  const json = await request.json();
  const payload = PrivatePolicyInputSchema.parse(json);

  const client = await createNoxClient({
    chainId: Number(process.env.NOX_CHAIN_ID ?? 421614),
    applicationContractAddress: process.env.NOX_APPLICATION_CONTRACT_ADDRESS ?? process.env.NOX_POLICY_CONTRACT_ADDRESS,
    gatewayUrl: process.env.NOX_HANDLE_GATEWAY_URL,
    handleContractAddress: process.env.NOX_HANDLE_CONTRACT_ADDRESS,
    subgraphUrl: process.env.NOX_HANDLE_SUBGRAPH_URL,
    enableMockFallback: true
  });

  const encryptedFields = await Promise.all([
    encryptUint256(client, "dailyBudgetUsd", payload.dailyBudgetUsd),
    encryptUint256(client, "minConfidenceScore", payload.minConfidenceScore),
    encryptUint256(client, "maxSlippageBps", payload.maxSlippageBps),
    encryptBool(client, "autoExecuteEnabled", payload.autoExecuteEnabled)
  ]);

  const response: EncryptedPolicyPayload = {
    policyId: `policy-${crypto.randomUUID()}`,
    encryptedAt: new Date().toISOString(),
    network: "Dev mock mode",
    handleVersion: client.mode === "live" ? "nox-live-v1" : "mock-v1",
    publicSummary: {
      allowedTokens: payload.allowedTokens,
      allowedProtocol: payload.allowedProtocol,
      oneTradePerDay: payload.oneTradePerDay,
      sessionExpiryHours: payload.sessionExpiryHours,
      autoExecuteEnabled: payload.autoExecuteEnabled
    },
    encryptedFields
  };

  return NextResponse.json(EncryptedPolicyPayloadSchema.parse(response));
}
