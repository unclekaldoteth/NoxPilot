"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { createNoxClient, encryptBool, encryptUint256, publicDecryptHandle } from "@noxpilot/nox-sdk";
import {
  demoExecutionState,
  demoVaultState,
  mockRecommendation,
  type ActivityItem,
  type AppMode,
  type EncryptedPolicyPayload,
  type ExecutionDecision,
  type ExecutionWalletState,
  type PrivatePolicyInput,
  type Recommendation,
  type ResearchExplainResponse,
  type ResearchRankResponse,
  type SettlementResult,
  type VaultState
} from "@noxpilot/shared";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import {
  buildDefaultPolicyInput,
  buildEncryptedPolicyFromChain,
  computeWhitelistRoot,
  createExecutionReference,
  describeWriteAction,
  erc20Abi,
  encodePolicyMetadata,
  executionGuardAbi,
  formatEthBalance,
  getExecutionGuardAddress,
  getNoxApplicationAddress,
  getPolicyVaultAddress,
  policyVaultAbi,
  quoterV2Abi,
  SUPPORTED_CHAIN_ID,
  tokenHash,
  toPolicyRefs,
  toSessionSnapshot
} from "@/lib/contracts";
import {
  getConfiguredDemoTokens,
  getDefaultPoolFee,
  getDexQuoterAddress,
  getDexRouterAddress,
  getSessionAssetConfig,
  getTokenConfig,
  tokenUnitsToNumber,
  usdToSessionAssetUnits
} from "@/lib/dex";
import { devMocksEnabled, liveConfigReady, noxClientConfigReady, publicEnv } from "@/lib/env";
import { buildSettlement, createActivity, evaluateExecution } from "@/lib/execution-engine";
import { fetchMarketSnapshot } from "@/lib/research";

type WalletSource = "mock" | "live" | "disconnected";
type ResearchSource = "agent" | "mock" | null;
type FundingStage = "idle" | "opening-session" | "approving-asset" | "funding-guard" | "ready";

type AppStateContextValue = {
  mode: AppMode;
  devMocksEnabled: boolean;
  liveConfigReady: boolean;
  noxClientConfigReady: boolean;
  topologyReady: boolean;
  hasUsedSafetyControl: boolean;
  walletSource: WalletSource;
  walletConnected: boolean;
  walletAddress: string | null;
  chainId: number | null;
  networkSupported: boolean;
  systemPaused: boolean;
  vault: VaultState;
  executionWallet: ExecutionWalletState;
  policy: PrivatePolicyInput | null;
  encryptedPolicy: EncryptedPolicyPayload | null;
  research: ResearchRankResponse | null;
  researchExplanation: ResearchExplainResponse | null;
  researchRankSource: ResearchSource;
  researchExplainSource: ResearchSource;
  recommendation: Recommendation | null;
  decision: ExecutionDecision | null;
  settlement: SettlementResult | null;
  activity: ActivityItem[];
  lastError: string | null;
  /* Loading states for visual feedback */
  isInitializing: boolean;
  isPolicySaving: boolean;
  isFunding: boolean;
  fundingStage: FundingStage;
  isExecuting: boolean;
  isSettling: boolean;
  isPausing: boolean;
  setMode: (mode: AppMode) => void;
  initializeTopology: () => Promise<void>;
  savePolicy: (policy: PrivatePolicyInput) => Promise<void>;
  setResearchResult: (research: ResearchRankResponse, source?: Exclude<ResearchSource, null>) => void;
  setResearchExplanation: (explanation: ResearchExplainResponse, source?: Exclude<ResearchSource, null>) => void;
  evaluateDecision: () => ExecutionDecision;
  fundExecutionWallet: () => Promise<void>;
  executeTrade: () => Promise<void>;
  settleToVault: () => Promise<void>;
  togglePause: () => Promise<void>;
  revokeSession: () => Promise<void>;
  refreshFromChain: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function createEmptyVault(address?: string | null, chainId = SUPPORTED_CHAIN_ID): VaultState {
  return {
    walletAddress: address ?? "Wallet not connected",
    chainId,
    networkLabel: "Arbitrum Sepolia",
    nativeBalanceEth: null,
    nativeBalanceUsd: null,
    totalBalanceUsd: 0,
    allocatedSessionUsd: 0,
    availableBalanceUsd: 0,
    status: address ? "ready" : "idle"
  };
}

function createEmptyExecutionWallet(address?: string | null): ExecutionWalletState {
  return {
    walletAddress: address ?? "Execution wallet unassigned",
    nativeBalanceEth: null,
    nativeBalanceUsd: null,
    dailyBudgetUsd: 0,
    remainingBudgetUsd: 0,
    sessionActive: false,
    sessionEndsAt: null,
    tradesUsedToday: 0,
    tradeLimit: 1,
    status: "idle"
  };
}

function normalizeActivity(current: ActivityItem[], item: ActivityItem) {
  return [item, ...current].slice(0, 20);
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const defaultMode: AppMode =
    publicEnv.NEXT_PUBLIC_APP_MODE === "mock" && devMocksEnabled ? "mock" : "live";
  const [mode, setModeState] = useState<AppMode>(defaultMode);
  const [systemPaused, setSystemPaused] = useState(false);
  const [vault, setVault] = useState<VaultState>(defaultMode === "mock" ? demoVaultState : createEmptyVault());
  const [executionWallet, setExecutionWallet] = useState<ExecutionWalletState>(
    defaultMode === "mock" ? demoExecutionState : createEmptyExecutionWallet()
  );
  const [policy, setPolicy] = useState<PrivatePolicyInput | null>(buildDefaultPolicyInput());
  const [encryptedPolicy, setEncryptedPolicy] = useState<EncryptedPolicyPayload | null>(null);
  const [research, setResearch] = useState<ResearchRankResponse | null>(null);
  const [researchExplanation, setResearchExplanationState] = useState<ResearchExplainResponse | null>(null);
  const [researchRankSource, setResearchRankSource] = useState<ResearchSource>(null);
  const [researchExplainSource, setResearchExplainSource] = useState<ResearchSource>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [lastExecutedSymbol, setLastExecutedSymbol] = useState<string | null>(null);
  const [decision, setDecision] = useState<ExecutionDecision | null>(null);
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [topologyReady, setTopologyReady] = useState(defaultMode === "mock");
  const [hasUsedSafetyControl, setHasUsedSafetyControl] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPolicySaving, setIsPolicySaving] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingStage, setFundingStage] = useState<FundingStage>("idle");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const hasInitializedEffect = useRef(false);

  const walletConnected = mode === "mock" ? true : Boolean(isConnected && address);
  const walletSource: WalletSource = mode === "mock" ? "mock" : walletConnected ? "live" : "disconnected";
  const walletAddress = mode === "mock" ? demoVaultState.walletAddress : address ?? null;
  const networkSupported = mode === "mock" || chainId === SUPPORTED_CHAIN_ID;

  function appendActivity(item: ReturnType<typeof createActivity>) {
    setActivity((current) => normalizeActivity(current, item));
  }

  function resetLiveTransientState() {
    setResearch(null);
    setResearchExplanationState(null);
    setResearchRankSource(null);
    setResearchExplainSource(null);
    setRecommendation(null);
    setLastExecutedSymbol(null);
    setDecision(null);
    setSettlement(null);
    setFundingStage("idle");
    setHasUsedSafetyControl(false);
  }

  function setMode(nextMode: AppMode) {
    if (nextMode === "mock") {
      if (!devMocksEnabled) {
        setLastError("Dev mock mode is disabled. The judged flow stays live by default.");
        appendActivity(
          createActivity(
            "system",
            "warning",
            "Mock mode blocked",
            "Dev mock mode is not enabled in env, so the app stayed on the live integration path."
          )
        );
        return;
      }

      setModeState("mock");
      setLastError(null);
      setSystemPaused(false);
      setTopologyReady(false);
      setVault(demoVaultState);
      setExecutionWallet(demoExecutionState);
      setPolicy(buildDefaultPolicyInput());
      setEncryptedPolicy(null);
      resetLiveTransientState();
      appendActivity(
        createActivity(
          "operator",
          "warning",
          "Dev mock mode enabled",
          "Mock mode is explicit opt-in only and is not the judged submission path."
        )
      );
      return;
    }

    setModeState("live");
    setLastError(null);
    setTopologyReady(false);
    setVault(createEmptyVault(address ?? null, chainId || SUPPORTED_CHAIN_ID));
    setExecutionWallet(createEmptyExecutionWallet());
    resetLiveTransientState();
    appendActivity(
      createActivity(
        "operator",
        "info",
        "Live mode enabled",
        "The app is now using the real wallet, real contracts, and the live research agent path."
      )
    );
  }

  function assertLiveMode(action: string) {
    if (mode !== "live") {
      throw new Error(`${action} is disabled because the app is in dev-only mock mode.`);
    }
    if (!walletConnected || !address) {
      throw new Error(`${action} requires a connected wallet.`);
    }
    if (!networkSupported) {
      throw new Error("Switch the wallet to Arbitrum Sepolia before continuing.");
    }
    if (!publicClient || !walletClient) {
      throw new Error("Wallet client is not ready yet.");
    }
    if (!liveConfigReady) {
      throw new Error("Contract configuration is incomplete. Set the live contract env variables first.");
    }

    return {
      address,
      publicClient,
      walletClient,
      policyVaultAddress: getPolicyVaultAddress(),
      executionGuardAddress: getExecutionGuardAddress()
    };
  }

  async function sendWrite(params: {
    contractAddress: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) {
    const live = assertLiveMode(params.functionName);
    const simulation = await live.publicClient.simulateContract({
      account: live.address,
      address: params.contractAddress,
      abi: params.abi as never,
      functionName: params.functionName as never,
      args: (params.args ?? []) as never
    });
    const txHash = await live.walletClient.writeContract(simulation.request);
    const receipt = await live.publicClient.waitForTransactionReceipt({ hash: txHash });
    return {
      txHash,
      receipt,
      result: simulation.result
    };
  }

  async function ensureTokenAllowance(tokenAddress: `0x${string}`, spender: `0x${string}`, requiredAmount: bigint) {
    const live = assertLiveMode("Token approval");
    const allowance = (await live.publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [live.address, spender]
    })) as bigint;

    if (allowance >= requiredAmount) {
      return null;
    }

    const { txHash } = await sendWrite({
      contractAddress: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, requiredAmount]
    });

    return txHash;
  }

  async function readTokenBalance(tokenAddress: `0x${string}`, holder: `0x${string}`) {
    const live = assertLiveMode("Token balance read");
    return (await live.publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [holder]
    })) as bigint;
  }

  async function quoteSessionSwap(tokenOut: `0x${string}`, amountIn: bigint, poolFee: number) {
    const live = assertLiveMode("Swap quote");
    const sessionAsset = getSessionAssetConfig();
    const quote = (await live.publicClient.readContract({
      address: getDexQuoterAddress(),
      abi: quoterV2Abi,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn: sessionAsset.address,
          tokenOut,
          amountIn,
          fee: poolFee,
          sqrtPriceLimitX96: 0n
        }
      ]
    })) as readonly [bigint, bigint, number, bigint];

    return quote[0];
  }

  async function estimateReturnedAmountUsd(outputSymbol: string, outputBalance: bigint, sessionAssetBalance: bigint) {
    const sessionAsset = getSessionAssetConfig();
    const outputToken = getTokenConfig(outputSymbol);
    const snapshot = await fetchMarketSnapshot(
      outputToken.symbol === sessionAsset.symbol ? [sessionAsset.symbol] : [sessionAsset.symbol, outputToken.symbol]
    );

    const sessionAssetValue = tokenUnitsToNumber(sessionAssetBalance, sessionAsset.decimals);
    if (outputToken.symbol === sessionAsset.symbol) {
      return Number(sessionAssetValue.toFixed(2));
    }

    const outputSignal = snapshot.data.signals.find((signal) => signal.symbol === outputToken.symbol);
    const outputPrice =
      outputSignal?.market_price_usd ??
      recommendation?.market_price_usd ??
      (() => {
        throw new Error(`Live market pricing for ${outputToken.symbol} is unavailable.`);
      })();

    const outputValue = tokenUnitsToNumber(outputBalance, outputToken.decimals) * outputPrice;
    return Number((sessionAssetValue + outputValue).toFixed(2));
  }

  async function fetchEthPriceUsd() {
    try {
      const snapshot = await fetchMarketSnapshot(["ETH"]);
      return snapshot.data.signals.find((signal) => signal.symbol === "ETH")?.market_price_usd ?? null;
    } catch {
      return null;
    }
  }

  async function createLiveNoxHandleClient(action: string) {
    const live = assertLiveMode(action);
    if (!noxClientConfigReady) {
      throw new Error("Public Nox application contract config is missing. Live policy encryption is disabled.");
    }

    const noxClient = await createNoxClient({
      chainId: SUPPORTED_CHAIN_ID,
      applicationContractAddress: getNoxApplicationAddress(),
      gatewayUrl: publicEnv.NEXT_PUBLIC_NOX_HANDLE_GATEWAY_URL || undefined,
      handleContractAddress: publicEnv.NEXT_PUBLIC_NOX_HANDLE_CONTRACT_ADDRESS || undefined,
      subgraphUrl: publicEnv.NEXT_PUBLIC_NOX_HANDLE_SUBGRAPH_URL || undefined,
      viemClient: live.walletClient,
      enableMockFallback: false
    });

    if (noxClient.mode !== "live") {
      throw new Error("The Nox handle client could not enter live mode. Dev mock fallback is disabled by design.");
    }

    return noxClient;
  }

  async function refreshFromChain() {
    if (mode !== "live") {
      return;
    }

    if (!walletConnected || !address || !publicClient) {
      setVault(createEmptyVault(address ?? null, chainId || SUPPORTED_CHAIN_ID));
      setExecutionWallet(createEmptyExecutionWallet());
      setSystemPaused(false);
      setTopologyReady(false);
      setFundingStage("idle");
      return;
    }

    if (!networkSupported || !liveConfigReady) {
      setVault(createEmptyVault(address, chainId || SUPPORTED_CHAIN_ID));
      setExecutionWallet(createEmptyExecutionWallet());
      setTopologyReady(false);
      setFundingStage("idle");
      return;
    }

    try {
      const policyVaultAddress = getPolicyVaultAddress();
      const executionGuardAddress = getExecutionGuardAddress();
      const [
        owner,
        executionWalletAddress,
        executionController,
        paused,
        policyRefsTuple,
        sessionTuple,
        remainingBudget,
        walletBalanceWei
      ] =
        await Promise.all([
          publicClient.readContract({
            address: policyVaultAddress,
            abi: policyVaultAbi,
            functionName: "owner"
          }) as Promise<`0x${string}`>,
          publicClient.readContract({
            address: policyVaultAddress,
            abi: policyVaultAbi,
            functionName: "executionWallet"
          }) as Promise<`0x${string}`>,
          publicClient.readContract({
            address: policyVaultAddress,
            abi: policyVaultAbi,
            functionName: "executionController"
          }) as Promise<`0x${string}`>,
          publicClient.readContract({
            address: policyVaultAddress,
            abi: policyVaultAbi,
            functionName: "paused"
          }) as Promise<boolean>,
          publicClient.readContract({
            address: policyVaultAddress,
            abi: policyVaultAbi,
            functionName: "policyRefs"
          }) as Promise<readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, string, string, bigint]>,
          publicClient.readContract({
            address: policyVaultAddress,
            abi: policyVaultAbi,
            functionName: "sessionSnapshot"
          }) as Promise<readonly [boolean, bigint, bigint, number, number, bigint, bigint, bigint]>,
          publicClient.readContract({
            address: policyVaultAddress,
            abi: policyVaultAbi,
            functionName: "remainingSessionBudget"
          }) as Promise<bigint>,
          publicClient.getBalance({
            address
          })
        ]);

      const executionBalanceWei =
        executionWalletAddress && executionWalletAddress !== "0x0000000000000000000000000000000000000000"
          ? await publicClient.getBalance({ address: executionWalletAddress })
          : 0n;

      const ethPriceUsd = await fetchEthPriceUsd();
      const vaultBalanceEth = formatEthBalance(walletBalanceWei);
      const vaultBalanceUsd = ethPriceUsd === null ? null : Number((vaultBalanceEth * ethPriceUsd).toFixed(2));
      const executionBalanceEth = formatEthBalance(executionBalanceWei);
      const executionBalanceUsd =
        ethPriceUsd === null ? null : Number((executionBalanceEth * ethPriceUsd).toFixed(2));

      const policyRefs = toPolicyRefs(policyRefsTuple);
      const session = toSessionSnapshot(sessionTuple);
      const chainPolicy = buildEncryptedPolicyFromChain(policyRefs);

      setSystemPaused(paused);
      setVault({
        walletAddress: address,
        chainId: chainId || SUPPORTED_CHAIN_ID,
        networkLabel: "Arbitrum Sepolia",
        nativeBalanceEth: vaultBalanceEth,
        nativeBalanceUsd: vaultBalanceUsd,
        totalBalanceUsd: vaultBalanceUsd ?? 0,
        allocatedSessionUsd: Number(session.fundedAmountUsd),
        availableBalanceUsd:
          vaultBalanceUsd === null
            ? 0
            : Math.max(Number((vaultBalanceUsd - Number(session.fundedAmountUsd)).toFixed(2)), 0),
        status: paused ? "paused" : session.active ? "active" : "ready"
      });
      setExecutionWallet({
        walletAddress:
          executionWalletAddress && executionWalletAddress !== "0x0000000000000000000000000000000000000000"
            ? executionWalletAddress
            : "Execution wallet unassigned",
        nativeBalanceEth: executionBalanceWei > 0n ? executionBalanceEth : null,
        nativeBalanceUsd: executionBalanceWei > 0n ? executionBalanceUsd : null,
        dailyBudgetUsd: Number(session.fundedAmountUsd),
        remainingBudgetUsd: Number(remainingBudget),
        sessionActive: session.active,
        sessionEndsAt: session.expiresAt > 0n ? new Date(Number(session.expiresAt) * 1000).toISOString() : null,
        tradesUsedToday: session.tradesUsed,
        tradeLimit: session.tradeLimit || 1,
        status: paused ? "paused" : session.active ? (session.tradesUsed > 0 ? "executed" : "funded") : "idle"
      });
      setFundingStage(session.active ? "ready" : "idle");
      if (chainPolicy) {
        setEncryptedPolicy(chainPolicy);
        setPolicy((current) =>
          current ??
          ({
            ...buildDefaultPolicyInput(),
            allowedTokens: chainPolicy.publicSummary.allowedTokens,
            allowedProtocol: chainPolicy.publicSummary.allowedProtocol,
            oneTradePerDay: chainPolicy.publicSummary.oneTradePerDay,
            sessionExpiryHours: chainPolicy.publicSummary.sessionExpiryHours,
            autoExecuteEnabled: chainPolicy.publicSummary.autoExecuteEnabled
          } as PrivatePolicyInput)
        );
      }

      const guardPolicyVault = (await publicClient.readContract({
        address: executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "policyVault"
      })) as `0x${string}`;
      const [guardAdmin, guardSessionAsset, guardSwapRouter, guardPoolFee] = await Promise.all([
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "admin"
        }) as Promise<`0x${string}`>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "sessionAsset"
        }) as Promise<`0x${string}`>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "swapRouter"
        }) as Promise<`0x${string}`>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "defaultPoolFee"
        }) as Promise<number>
      ]);

      if (guardPolicyVault.toLowerCase() !== policyVaultAddress.toLowerCase()) {
        throw new Error("ExecutionGuard is not wired to the configured PolicyVault address.");
      }
      if (guardSessionAsset.toLowerCase() !== getSessionAssetConfig().address.toLowerCase()) {
        throw new Error("ExecutionGuard session asset does not match the configured session asset.");
      }
      if (guardSwapRouter.toLowerCase() !== getDexRouterAddress().toLowerCase()) {
        throw new Error("ExecutionGuard router does not match the configured DEX router.");
      }
      if (Number(guardPoolFee) !== getDefaultPoolFee()) {
        throw new Error("ExecutionGuard pool fee does not match the configured DEX pool fee.");
      }

      const executionWalletAssigned =
        executionWalletAddress.toLowerCase() !== "0x0000000000000000000000000000000000000000";
      const operatorMatchesContracts =
        owner.toLowerCase() === address.toLowerCase() && guardAdmin.toLowerCase() === address.toLowerCase();
      setTopologyReady(
        executionWalletAssigned &&
          operatorMatchesContracts &&
          executionController.toLowerCase() === executionGuardAddress.toLowerCase()
      );
    } catch (error) {
      setTopologyReady(false);
      const message = error instanceof Error ? error.message : "Unable to refresh live contract state.";
      setLastError(message);
      appendActivity(createActivity("system", "error", "Live state refresh failed", message));
    }
  }

  async function initializeTopology() {
    setIsInitializing(true);
    if (mode === "mock") {
      setTopologyReady(true);
      setVault((current) => ({ ...current, status: systemPaused ? "paused" : "ready" }));
      setExecutionWallet((current) => ({ ...current, status: systemPaused ? "paused" : "idle" }));
      appendActivity(
        createActivity(
          "system",
          "warning",
          "Mock topology initialized",
          "This is a dev-only fallback path and not the judged submission flow."
        )
      );
      setIsInitializing(false);
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Topology initialization");
      const [owner, executionWalletAddress, executionController, guardAdmin] = await Promise.all([
        live.publicClient.readContract({
          address: live.policyVaultAddress,
          abi: policyVaultAbi,
          functionName: "owner"
        }) as Promise<`0x${string}`>,
        live.publicClient.readContract({
          address: live.policyVaultAddress,
          abi: policyVaultAbi,
          functionName: "executionWallet"
        }) as Promise<`0x${string}`>,
        live.publicClient.readContract({
          address: live.policyVaultAddress,
          abi: policyVaultAbi,
          functionName: "executionController"
        }) as Promise<`0x${string}`>,
        live.publicClient.readContract({
          address: live.executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "admin"
        }) as Promise<`0x${string}`>
      ]);

      if (owner.toLowerCase() !== live.address.toLowerCase()) {
        throw new Error("Connected wallet is not the PolicyVault owner. Use the deployed owner wallet for the live demo.");
      }
      if (guardAdmin.toLowerCase() !== live.address.toLowerCase()) {
        throw new Error("Connected wallet is not the ExecutionGuard admin. Use the deployed admin wallet for the live demo.");
      }

      const executionWalletUnassigned =
        executionWalletAddress.toLowerCase() === "0x0000000000000000000000000000000000000000";

      if (executionWalletUnassigned) {
        const { txHash } = await sendWrite({
          contractAddress: live.policyVaultAddress,
          abi: policyVaultAbi,
          functionName: "registerExecutionWallet",
          args: [live.address]
        });
        appendActivity(
          createActivity(
            "operator",
            "success",
            "Execution wallet registered",
            describeWriteAction(txHash, "PolicyVault.registerExecutionWallet")
            )
          );
      } else if (executionWalletAddress.toLowerCase() !== live.address.toLowerCase()) {
        appendActivity(
          createActivity(
            "system",
            "info",
            "Execution wallet already configured",
            `PolicyVault already points to ${executionWalletAddress}. The connected owner/admin wallet can still drive the guarded demo path without overwriting that execution identity.`
          )
        );
      }

      if (executionController.toLowerCase() !== live.executionGuardAddress.toLowerCase()) {
        const { txHash } = await sendWrite({
          contractAddress: live.policyVaultAddress,
          abi: policyVaultAbi,
          functionName: "registerExecutionController",
          args: [live.executionGuardAddress]
        });
        appendActivity(
          createActivity(
            "operator",
            "success",
            "Execution controller registered",
            describeWriteAction(txHash, "PolicyVault.registerExecutionController")
          )
        );
      }

      if (
        !executionWalletUnassigned &&
        executionController.toLowerCase() === live.executionGuardAddress.toLowerCase()
      ) {
        appendActivity(
          createActivity(
            "system",
            "success",
            "Topology verified on-chain",
            "PolicyVault ownership, execution wallet registration, and ExecutionGuard wiring already match the live demo requirements."
          )
        );
      }

      await refreshFromChain();
      setIsInitializing(false);
    } catch (error) {
      setIsInitializing(false);
      const message = error instanceof Error ? error.message : "Unable to initialize live topology.";
      setLastError(message);
      appendActivity(createActivity("system", "error", "Topology initialization failed", message));
      throw error;
    }
  }

  async function savePolicy(nextPolicy: PrivatePolicyInput) {
    setIsPolicySaving(true);
    if (mode === "mock") {
      const encrypted = await Promise.all([
        Promise.resolve({
          field: "dailyBudgetUsd",
          handle: `mock-${Date.now().toString(36)}-budget`,
          preview: "Dev-only mock handle",
          mode: "mock" as const
        }),
        Promise.resolve({
          field: "minConfidenceScore",
          handle: `mock-${Date.now().toString(36)}-confidence`,
          preview: "Dev-only mock handle",
          mode: "mock" as const
        }),
        Promise.resolve({
          field: "maxSlippageBps",
          handle: `mock-${Date.now().toString(36)}-slippage`,
          preview: "Dev-only mock handle",
          mode: "mock" as const
        }),
        Promise.resolve({
          field: "autoExecuteEnabled",
          handle: `mock-${Date.now().toString(36)}-auto`,
          preview: "Dev-only mock handle",
          mode: "mock" as const
        })
      ]);

      setPolicy(nextPolicy);
      setEncryptedPolicy({
        policyId: `mock-${crypto.randomUUID()}`,
        encryptedAt: new Date().toISOString(),
        network: "Mock",
        handleVersion: "mock-v1",
        publicSummary: {
          allowedTokens: nextPolicy.allowedTokens,
          allowedProtocol: nextPolicy.allowedProtocol,
          oneTradePerDay: nextPolicy.oneTradePerDay,
          sessionExpiryHours: nextPolicy.sessionExpiryHours,
          autoExecuteEnabled: nextPolicy.autoExecuteEnabled
        },
        encryptedFields: encrypted
      });
      appendActivity(
        createActivity(
          "operator",
          "warning",
          "Mock policy stored",
          "Policy handles were generated in dev-only mock mode."
        )
      );
      setIsPolicySaving(false);
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Policy save");
      const noxClient = await createLiveNoxHandleClient("Policy save");

      const policyId = `policy-${crypto.randomUUID()}`;
      const encryptedFields = await Promise.all([
        encryptUint256(noxClient, "dailyBudgetUsd", nextPolicy.dailyBudgetUsd),
        encryptUint256(noxClient, "minConfidenceScore", nextPolicy.minConfidenceScore),
        encryptUint256(noxClient, "maxSlippageBps", nextPolicy.maxSlippageBps),
        encryptBool(noxClient, "autoExecuteEnabled", nextPolicy.autoExecuteEnabled)
      ]);
      const dailyBudgetProof = encryptedFields[0].proof;
      if (!dailyBudgetProof) {
        throw new Error("Nox daily budget encryption did not return a handle proof.");
      }
      const minConfidenceProof = encryptedFields[1].proof;
      if (!minConfidenceProof) {
        throw new Error("Nox min-confidence encryption did not return a handle proof.");
      }

      const whitelistRoot = computeWhitelistRoot(nextPolicy.allowedTokens);
      const metadataUri = encodePolicyMetadata({
        policyId,
        allowedTokens: nextPolicy.allowedTokens,
        oneTradePerDay: nextPolicy.oneTradePerDay,
        sessionExpiryHours: nextPolicy.sessionExpiryHours,
        autoExecuteEnabled: nextPolicy.autoExecuteEnabled
      });

      const { txHash: updateTxHash } = await sendWrite({
        contractAddress: live.policyVaultAddress,
        abi: policyVaultAbi,
        functionName: "updatePolicyWithNox",
        args: [
          encryptedFields[0].handle,
          dailyBudgetProof,
          encryptedFields[1].handle,
          minConfidenceProof,
          encryptedFields[2].handle,
          encryptedFields[3].handle,
          whitelistRoot,
          nextPolicy.allowedProtocol,
          metadataUri
        ]
      });

      const { txHash: syncTxHash } = await sendWrite({
        contractAddress: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "syncPolicyWhitelistRoot"
      });

      const tokenUniverse = new Set([
        ...getConfiguredDemoTokens().map((token) => token.symbol),
        ...(encryptedPolicy?.publicSummary.allowedTokens ?? []),
        ...nextPolicy.allowedTokens
      ]);

      for (const symbol of tokenUniverse) {
        const configuredToken = getTokenConfig(symbol);
        await sendWrite({
          contractAddress: live.executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "setAllowedToken",
          args: [tokenHash(symbol), nextPolicy.allowedTokens.includes(symbol)]
        });
        await sendWrite({
          contractAddress: live.executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "setAllowedTokenAddress",
          args: [configuredToken.address, nextPolicy.allowedTokens.includes(symbol)]
        });
      }

      const nextEncryptedPolicy: EncryptedPolicyPayload = {
        policyId,
        encryptedAt: new Date().toISOString(),
        network: "Arbitrum Sepolia",
        handleVersion: "nox-live-v1",
        publicSummary: {
          allowedTokens: nextPolicy.allowedTokens,
          allowedProtocol: nextPolicy.allowedProtocol,
          oneTradePerDay: nextPolicy.oneTradePerDay,
          sessionExpiryHours: nextPolicy.sessionExpiryHours,
          autoExecuteEnabled: nextPolicy.autoExecuteEnabled
        },
        encryptedFields
      };

      setPolicy(nextPolicy);
      setEncryptedPolicy(nextEncryptedPolicy);
      setResearchExplanationState(null);
      setResearchExplainSource(null);
      setDecision(null);
      setSettlement(null);
      setLastExecutedSymbol(null);
      appendActivity(
        createActivity(
          "operator",
          "success",
          "Policy encrypted through Nox",
          "The daily budget and min-confidence threshold were encrypted with a wallet-backed Nox Handle client and submitted with proof-backed handles for on-chain validation."
        )
      );
      appendActivity(
        createActivity(
          "operator",
          "success",
          "Policy saved on-chain",
          `${describeWriteAction(updateTxHash, "PolicyVault.updatePolicyWithNox")} Then synced the guard whitelist root in tx ${syncTxHash}.`
        )
      );
      await refreshFromChain();
      setIsPolicySaving(false);
    } catch (error) {
      setIsPolicySaving(false);
      const message = error instanceof Error ? error.message : "Unable to save live policy.";
      setLastError(message);
      appendActivity(createActivity("system", "error", "Policy save failed", message));
      throw error;
    }
  }

  function setResearchResult(nextResearch: ResearchRankResponse, source: Exclude<ResearchSource, null> = "agent") {
    setResearch(nextResearch);
    setRecommendation(nextResearch.bestCandidate);
    setResearchExplanationState(null);
    setResearchExplainSource(null);
    setResearchRankSource(source);
    setDecision(null);
    appendActivity(
      createActivity(
        source === "mock" ? "system" : "research-agent",
        source === "mock" ? "warning" : "success",
        "Research ranking received",
        `${nextResearch.bestCandidate.symbol} is the top ranked candidate from the ${source === "mock" ? "dev mock" : "live"} research service.`
      )
    );
  }

  function setResearchExplanation(
    explanation: ResearchExplainResponse,
    source: Exclude<ResearchSource, null> = "agent"
  ) {
    setResearchExplanationState(explanation);
    setResearchExplainSource(source);
    appendActivity(
      createActivity(
        source === "mock" ? "system" : "research-agent",
        source === "mock" ? "warning" : "info",
        "Research explanation received",
        explanation.summary
      )
    );
  }

  function evaluateDecisionAction() {
    const nextDecision = evaluateExecution({
      mode,
      paused: systemPaused,
      policy,
      recommendation,
      vault,
      executionWallet
    });
    setDecision(nextDecision);
    appendActivity(
      createActivity(
        "execution-layer",
        nextDecision.allowed ? "success" : "warning",
        "Execution decision evaluated",
        nextDecision.allowed
          ? "The live recommendation cleared the bounded session checks."
          : nextDecision.reasons[0] ?? "Execution remains blocked."
      )
    );
    return nextDecision;
  }

  async function fundExecutionWallet() {
    if (!policy || !decision?.allowed) {
      const message = "A saved policy and an allowed execution decision are required before opening a live session.";
      setLastError(message);
      appendActivity(createActivity("execution-layer", "warning", "Funding blocked", message));
      throw new Error(message);
    }

    setIsFunding(true);
    if (mode === "mock") {
      setFundingStage("ready");
      setExecutionWallet((current) => ({
        ...current,
        dailyBudgetUsd: policy.dailyBudgetUsd,
        remainingBudgetUsd: policy.dailyBudgetUsd,
        sessionActive: true,
        sessionEndsAt: new Date(Date.now() + policy.sessionExpiryHours * 60 * 60 * 1000).toISOString(),
        status: "funded"
      }));
      appendActivity(
        createActivity(
          "execution-layer",
          "warning",
          "Mock session opened",
          "This funding step ran in dev-only mock mode."
        )
      );
      setIsFunding(false);
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Session funding");
      const fundedAmountUsd = Math.round(decision.requiredFundingUsd);
      const sessionAssetAmount = usdToSessionAssetUnits(fundedAmountUsd);
      const sessionAsset = getSessionAssetConfig();
      const tradeLimit = policy.oneTradePerDay ? 1 : Math.max(executionWallet.tradeLimit, 2);
      setFundingStage("opening-session");
      const { txHash: openSessionTxHash } = await sendWrite({
        contractAddress: live.policyVaultAddress,
        abi: policyVaultAbi,
        functionName: "openSession",
        args: [BigInt(fundedAmountUsd), tradeLimit, BigInt(policy.sessionExpiryHours)]
      });
      setFundingStage("approving-asset");
      const approvalTxHash = await ensureTokenAllowance(
        sessionAsset.address,
        live.executionGuardAddress,
        sessionAssetAmount
      );
      setFundingStage("funding-guard");
      const { txHash: fundTxHash } = await sendWrite({
        contractAddress: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "fundSessionAsset",
        args: [sessionAssetAmount, createExecutionReference("execution", `${sessionAsset.symbol}-funding`)]
      });
      appendActivity(
        createActivity(
          "execution-layer",
          "success",
          "Live session opened",
          `${describeWriteAction(openSessionTxHash, "PolicyVault.openSession")} Then funded ${fundedAmountUsd} ${sessionAsset.symbol} into ExecutionGuard in tx ${fundTxHash}.${approvalTxHash ? ` Approval tx: ${approvalTxHash}.` : ""}`
        )
      );
      setFundingStage("ready");
      await refreshFromChain();
    } catch (error) {
      setFundingStage("idle");
      const message = error instanceof Error ? error.message : "Unable to open the live session.";
      setLastError(message);
      appendActivity(createActivity("system", "error", "Funding failed", message));
      throw error;
    } finally {
      setIsFunding(false);
    }
  }

  async function executeTrade() {
    if (!policy || !recommendation || !decision?.allowed || !executionWallet.sessionActive) {
      const message = "An active live session and an allowed decision are required before execution.";
      setLastError(message);
      appendActivity(createActivity("execution-layer", "warning", "Execution blocked", message));
      throw new Error(message);
    }

    setIsExecuting(true);
    if (mode === "mock") {
      setExecutionWallet((current) => ({
        ...current,
        remainingBudgetUsd: 0,
        tradesUsedToday: current.tradesUsedToday + 1,
        status: "executed"
      }));
      appendActivity(
        createActivity(
          "execution-layer",
          "warning",
          "Mock execution recorded",
          "This execution step ran in dev-only mock mode."
        )
      );
      setIsExecuting(false);
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Execution");
      const noxClient = await createLiveNoxHandleClient("Execution");
      const sessionAsset = getSessionAssetConfig();
      const outputToken = getTokenConfig(recommendation.symbol);
      if (outputToken.symbol === sessionAsset.symbol) {
        throw new Error("The research recommendation currently points to the session asset. Wait for a non-session asset recommendation before executing a live swap.");
      }

      const spendAmountUsd = Math.round(decision.estimatedSpendUsd || executionWallet.remainingBudgetUsd);
      const observedConfidence = Math.round(recommendation.confidence);
      const amountIn = usdToSessionAssetUnits(spendAmountUsd);
      const { txHash: prepareTxHash } = await sendWrite({
        contractAddress: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "prepareConfidenceApproval",
        args: [BigInt(observedConfidence)]
      });
      const confidenceApprovalHandle = (await live.publicClient.readContract({
        address: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "pendingConfidenceApprovalHandles",
        args: [live.address]
      })) as `0x${string}`;

      if (!confidenceApprovalHandle || confidenceApprovalHandle === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        throw new Error("ExecutionGuard did not persist a confidential confidence approval handle.");
      }

      const confidenceApproval = await publicDecryptHandle(noxClient, confidenceApprovalHandle);
      if (confidenceApproval.solidityType !== "bool") {
        throw new Error(`ExecutionGuard returned an unexpected confidence approval type: ${confidenceApproval.solidityType}`);
      }

      appendActivity(
        createActivity(
          "execution-layer",
          confidenceApproval.value === "true" ? "info" : "warning",
          "Confidential confidence approval prepared",
          `${describeWriteAction(prepareTxHash, "ExecutionGuard.prepareConfidenceApproval")} The live Nox gateway returned a proof-backed boolean for the confidential min-confidence gate.`
        )
      );

      if (confidenceApproval.value !== "true") {
        const message = "The recommendation did not clear the confidential on-chain min-confidence threshold.";
        setLastError(message);
        appendActivity(createActivity("execution-layer", "warning", "Execution blocked", message));
        throw new Error(message);
      }

      const preview = (await live.publicClient.readContract({
        address: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "previewExecution",
        args: [
          tokenHash(recommendation.symbol),
          live.address,
          BigInt(spendAmountUsd),
          BigInt(observedConfidence)
        ]
      })) as readonly [boolean, string];

      if (!preview[0]) {
        throw new Error(preview[1]);
      }

      const quotedAmountOut = await quoteSessionSwap(outputToken.address, amountIn, outputToken.poolFee);
      const amountOutMinimum =
        quotedAmountOut - (quotedAmountOut * BigInt(policy.maxSlippageBps)) / 10_000n;
      const { txHash, result } = await sendWrite({
        contractAddress: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "executeExactInputSingle",
        args: [
          tokenHash(recommendation.symbol),
          outputToken.address,
          outputToken.poolFee,
          amountIn,
          amountOutMinimum,
          BigInt(spendAmountUsd),
          BigInt(observedConfidence),
          confidenceApproval.decryptionProof as `0x${string}`,
          createExecutionReference("execution", recommendation.symbol)
        ]
      });
      const actualAmountOut = typeof result === "bigint" ? result : quotedAmountOut;
      setLastExecutedSymbol(recommendation.symbol);
      appendActivity(
        createActivity(
          "execution-layer",
          "success",
          "Live swap executed",
          `${describeWriteAction(txHash, "ExecutionGuard.executeExactInputSingle")} Swapped ${spendAmountUsd} ${sessionAsset.symbol} for approximately ${tokenUnitsToNumber(actualAmountOut, outputToken.decimals).toFixed(6)} ${outputToken.symbol} after verifying the confidential min-confidence proof and a live quoter-derived min out.`
        )
      );
      await refreshFromChain();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to execute the live swap.";
      setLastError(message);
      appendActivity(createActivity("system", "error", "Execution failed", message));
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }

  async function settleToVault() {
    setIsSettling(true);
    if (mode === "mock") {
      const result = buildSettlement(recommendation ?? mockRecommendation, executionWallet.remainingBudgetUsd, mode);
      setSettlement(result);
      appendActivity(
        createActivity(
          "system",
          "warning",
          "Mock settlement recorded",
          "This settlement step ran in dev-only mock mode."
        )
      );
      setIsSettling(false);
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Settlement");
      const sessionAsset = getSessionAssetConfig();
      const outputSymbol = lastExecutedSymbol ?? recommendation?.symbol ?? sessionAsset.symbol;
      const outputToken = getTokenConfig(outputSymbol);
      const [sessionAssetBalance, outputBalance] = await Promise.all([
        readTokenBalance(sessionAsset.address, live.executionGuardAddress),
        outputToken.symbol === sessionAsset.symbol
          ? Promise.resolve(0n)
          : readTokenBalance(outputToken.address, live.executionGuardAddress)
      ]);

      const returnedAmountUsd = Math.round(
        await estimateReturnedAmountUsd(outputSymbol, outputBalance, sessionAssetBalance)
      );
      const tokensToSweep =
        outputToken.symbol === sessionAsset.symbol ? [] : ([outputToken.address] as `0x${string}`[]);
      const { txHash } = await sendWrite({
        contractAddress: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "settleSessionAssets",
        args: [
          tokensToSweep,
          BigInt(returnedAmountUsd),
          createExecutionReference("settlement", encryptedPolicy?.policyId ?? "policy")
        ]
      });

      const result: SettlementResult = {
        amountReturnedUsd: returnedAmountUsd,
        pnlUsd: 0,
        sessionClosed: true,
        txRef: txHash,
        summary:
          outputToken.symbol === sessionAsset.symbol
            ? "The active session was closed on-chain and the funded session asset was swept back to the vault wallet."
            : `The active session was closed on-chain and both ${sessionAsset.symbol} and ${outputToken.symbol} balances were swept back to the vault wallet.`
      };
      setSettlement(result);
      setLastExecutedSymbol(null);
      appendActivity(
        createActivity(
          "system",
          "success",
          "Session settled on-chain",
          describeWriteAction(txHash, "ExecutionGuard.settleSessionAssets")
        )
      );
      await refreshFromChain();
      setIsSettling(false);
    } catch (error) {
      setIsSettling(false);
      const message = error instanceof Error ? error.message : "Unable to settle the live session.";
      setLastError(message);
      appendActivity(createActivity("system", "error", "Settlement failed", message));
      throw error;
    }
  }

  async function togglePause() {
    setIsPausing(true);
    if (mode === "mock") {
      setSystemPaused((current) => !current);
      setHasUsedSafetyControl(true);
      appendActivity(
        createActivity(
          "operator",
          "warning",
          "Mock pause toggled",
          "Pause was toggled in dev-only mock mode."
        )
      );
      setIsPausing(false);
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Pause toggle");
      const nextPaused = !systemPaused;
      const { txHash } = await sendWrite({
        contractAddress: live.policyVaultAddress,
        abi: policyVaultAbi,
        functionName: "setPaused",
        args: [nextPaused]
      });
      appendActivity(
        createActivity(
          "operator",
          nextPaused ? "warning" : "success",
          nextPaused ? "System paused on-chain" : "System resumed on-chain",
          describeWriteAction(txHash, "PolicyVault.setPaused")
        )
      );
      setHasUsedSafetyControl(true);
      await refreshFromChain();
      setIsPausing(false);
    } catch (error) {
      setIsPausing(false);
      const message = error instanceof Error ? error.message : "Unable to toggle pause on-chain.";
      setLastError(message);
      appendActivity(createActivity("system", "error", "Pause toggle failed", message));
      throw error;
    }
  }

  async function revokeSession() {
    if (!executionWallet.sessionActive) {
      const message = "There is no active live session to revoke.";
      setLastError(message);
      appendActivity(createActivity("operator", "warning", "No active session", message));
      throw new Error(message);
    }

    try {
      await settleToVault();
      setHasUsedSafetyControl(true);
      appendActivity(
        createActivity(
          "operator",
          "warning",
          "Execution session revoked",
          "The operator closed the active session through the same on-chain settlement path used for normal reconciliation."
        )
      );
    } catch (error) {
      throw error;
    }
  }

  useEffect(() => {
    if (mode !== "live") {
      return;
    }
    void refreshFromChain();
    // The refresh function intentionally captures the latest wallet and chain state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, address, chainId, isConnected, publicClient]);

  useEffect(() => {
    if (!hasInitializedEffect.current) {
      hasInitializedEffect.current = true;
      return;
    }

    if (mode !== "live") {
      return;
    }

    if (!walletConnected) {
      setVault(createEmptyVault(null, chainId || SUPPORTED_CHAIN_ID));
      setExecutionWallet(createEmptyExecutionWallet());
      setSystemPaused(false);
      setTopologyReady(false);
      setFundingStage("idle");
      setHasUsedSafetyControl(false);
      return;
    }

    appendActivity(
      createActivity(
        "operator",
        networkSupported ? "success" : "warning",
        "Wallet session updated",
        networkSupported
          ? "Connected wallet is available for the live judged flow."
          : "Connected wallet is on the wrong network. Switch to Arbitrum Sepolia."
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected, networkSupported]);

  return (
    <AppStateContext.Provider
      value={{
        mode,
        devMocksEnabled,
        liveConfigReady,
        noxClientConfigReady,
        topologyReady,
        hasUsedSafetyControl,
        walletSource,
        walletConnected,
        walletAddress,
        chainId: chainId ?? null,
        networkSupported,
        systemPaused,
        vault,
        executionWallet,
        policy,
        encryptedPolicy,
        research,
        researchExplanation,
        researchRankSource,
        researchExplainSource,
        recommendation,
        decision,
        settlement,
        activity,
        lastError,
        isInitializing,
        isPolicySaving,
        isFunding,
        fundingStage,
        isExecuting,
        isSettling,
        isPausing,
        setMode,
        initializeTopology,
        savePolicy,
        setResearchResult,
        setResearchExplanation,
        evaluateDecision: evaluateDecisionAction,
        fundExecutionWallet,
        executeTrade,
        settleToVault,
        togglePause,
        revokeSession,
        refreshFromChain
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useNoxPilot() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useNoxPilot must be used inside RootProviders.");
  }

  return context;
}
