"use client";

import { Loader2, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { truncateAddress } from "@/lib/format";
import { useNoxPilot } from "@/components/providers/app-state-provider";
import { SUPPORTED_CHAIN_ID } from "@/lib/contracts";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { mode, devMocksEnabled, networkSupported, setMode, walletConnected } = useNoxPilot();

  const injectedConnector = connectors[0];

  if (mode === "mock") {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="warning">Dev mock mode</Badge>
        <Button variant="secondary" size="sm" onClick={() => setMode("live")}>
          Return to live mode
        </Button>
      </div>
    );
  }

  if (walletConnected && isConnected) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="success">Live wallet</Badge>
        {!networkSupported ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => switchChain({ chainId: SUPPORTED_CHAIN_ID })}
            disabled={isSwitchingChain}
          >
            {isSwitchingChain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Switch to Arbitrum Sepolia
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            disconnect();
          }}
        >
          <Wallet className="mr-2 h-4 w-4" />
          {truncateAddress(address ?? "0x0000000000000000000000000000000000000000")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="sm"
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        disabled={!injectedConnector || isPending}
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
        Connect wallet
      </Button>
      {devMocksEnabled ? (
        <Button variant="secondary" size="sm" onClick={() => setMode("mock")}>
          Enable dev mock mode
        </Button>
      ) : null}
      {!walletConnected && !devMocksEnabled ? (
        <Badge variant="muted">Live judged flow only</Badge>
      ) : null}
    </div>
  );
}
