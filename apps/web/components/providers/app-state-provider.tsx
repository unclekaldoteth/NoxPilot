"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import {
  createNoxClient,
  decryptHandle,
  encryptBool,
  encryptUint256,
  getHandleAcl,
  publicDecryptHandle
} from "@noxpilot/nox-sdk";
import {
  mockConfidentialPosition,
  demoExecutionState,
  demoVaultState,
  mockRecommendation,
  type ActivityItem,
  type AppMode,
  type ConfidentialPosition,
  type EncryptedPolicyPayload,
  type ExecutionDecision,
  type ExecutionWalletState,
  type PrivatePolicyInput,
  type Recommendation,
  type ResearchExplainResponse,
  type ResearchRankResponse,
  type SettlementResult,
  type TokenDiscoveryResponse,
  type VaultState
} from "@noxpilot/shared";
import { useAccount, useChainId, useConfig, usePublicClient } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import {
  buildDefaultPolicyInput,
  buildEncryptedPolicyFromChain,
  computeWhitelistRoot,
  createExecutionReference,
  confidentialWrapperAbi,
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
import { getConfidentialWrapperSupport } from "@/lib/confidential-assets";
import {
  getConfiguredDemoTokens,
  getDefaultPoolFee,
  getDexQuoterAddress,
  getDexRouterAddress,
  maybeGetTokenConfigByAddress,
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
type WrapStage = "idle" | "wrapping" | "wrapped";
type RevealStage = "idle" | "revealing";
type UnwrapStage = "idle" | "requesting" | "finalizing";
type PersistedRunState = {
  version: 1;
  updatedAt: string;
  tokenDiscovery: TokenDiscoveryResponse | null;
  tokenDiscoverySource: ResearchSource;
  research: ResearchRankResponse | null;
  researchRankSource: ResearchSource;
  researchExplanation: ResearchExplainResponse | null;
  researchExplainSource: ResearchSource;
  recommendation: Recommendation | null;
  decision: ExecutionDecision | null;
  settlement: SettlementResult | null;
  confidentialPosition: ConfidentialPosition | null;
  activity: ActivityItem[];
};

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
  tokenDiscovery: TokenDiscoveryResponse | null;
  researchExplanation: ResearchExplainResponse | null;
  tokenDiscoverySource: ResearchSource;
  researchRankSource: ResearchSource;
  researchExplainSource: ResearchSource;
  recommendation: Recommendation | null;
  decision: ExecutionDecision | null;
  settlement: SettlementResult | null;
  confidentialPosition: ConfidentialPosition | null;
  activity: ActivityItem[];
  lastError: string | null;
  /* Loading states for visual feedback */
  isInitializing: boolean;
  isPolicySaving: boolean;
  policySaveMessage: string | null;
  isFunding: boolean;
  fundingStage: FundingStage;
  isExecuting: boolean;
  isWrapping: boolean;
  wrapStage: WrapStage;
  isRevealing: boolean;
  revealStage: RevealStage;
  isUnwrapping: boolean;
  unwrapStage: UnwrapStage;
  isSettling: boolean;
  isPausing: boolean;
  setMode: (mode: AppMode) => void;
  initializeTopology: () => Promise<void>;
  savePolicy: (policy: PrivatePolicyInput) => Promise<void>;
  setTokenDiscoveryResult: (discovery: TokenDiscoveryResponse, source?: Exclude<ResearchSource, null>) => void;
  setResearchResult: (research: ResearchRankResponse, source?: Exclude<ResearchSource, null>) => void;
  setResearchExplanation: (explanation: ResearchExplainResponse, source?: Exclude<ResearchSource, null>) => void;
  evaluateDecision: () => ExecutionDecision;
  fundExecutionWallet: () => Promise<void>;
  executeTrade: () => Promise<void>;
  wrapAcquiredPosition: () => Promise<void>;
  revealConfidentialBalance: () => Promise<void>;
  unwrapConfidentialPosition: () => Promise<void>;
  settleToVault: () => Promise<void>;
  togglePause: () => Promise<void>;
  revokeSession: () => Promise<void>;
  refreshFromChain: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);
const PERSISTED_RUN_KEY = "noxpilot.operatorRun.v1";

function createEmptyVault(address?: string | null, chainId = SUPPORTED_CHAIN_ID): VaultState {
  return {
    walletAddress: address ?? "Wallet not connected",
    chainId,
    networkLabel: "Arbitrum Sepolia Testnet",
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
    sessionAssetSymbol: "USDC",
    sessionAssetBalance: null,
    sessionAssetAllowance: null,
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

function isZeroHex(value: string | null | undefined) {
  return !value || /^0x0{40,64}$/i.test(value);
}

function formatPublicAmount(amount: bigint, decimals: number) {
  const numeric = tokenUnitsToNumber(amount, decimals);
  return numeric.toFixed(6).replace(/\.?0+$/, "");
}

function buildConfidentialPosition(input: {
  symbol: string;
  address: string;
  wrapperAddress: string | null;
  publicAmount: string | null;
  chainId: number;
  encryptedAmountHandle: string | null;
  encryptedBalanceHandle: string | null;
  wrapTxHash: string | null;
  status: ConfidentialPosition["status"];
  previous?: ConfidentialPosition | null;
}): ConfidentialPosition {
  return {
    underlyingSymbol: input.symbol,
    underlyingAddress: input.address,
    wrapperAddress: input.wrapperAddress,
    chainId: input.chainId,
    publicAmount: input.publicAmount,
    encryptedAmountHandle: input.encryptedAmountHandle,
    encryptedBalanceHandle: input.encryptedBalanceHandle,
    wrapTxHash: input.wrapTxHash ?? input.previous?.wrapTxHash ?? null,
    unwrapRequestHandle: input.previous?.unwrapRequestHandle ?? null,
    unwrapTxHash: input.previous?.unwrapTxHash ?? null,
    finalizeUnwrapTxHash: input.previous?.finalizeUnwrapTxHash ?? null,
    viewerAclState: input.previous?.viewerAclState ?? null,
    decryptedBalance: input.previous?.decryptedBalance ?? null,
    revealError: input.previous?.revealError ?? null,
    status: input.status
  };
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
  const [tokenDiscovery, setTokenDiscovery] = useState<TokenDiscoveryResponse | null>(null);
  const [researchExplanation, setResearchExplanationState] = useState<ResearchExplainResponse | null>(null);
  const [tokenDiscoverySource, setTokenDiscoverySource] = useState<ResearchSource>(null);
  const [researchRankSource, setResearchRankSource] = useState<ResearchSource>(null);
  const [researchExplainSource, setResearchExplainSource] = useState<ResearchSource>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [lastExecutedSymbol, setLastExecutedSymbol] = useState<string | null>(null);
  const [decision, setDecision] = useState<ExecutionDecision | null>(null);
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const [confidentialPosition, setConfidentialPosition] = useState<ConfidentialPosition | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [topologyReady, setTopologyReady] = useState(defaultMode === "mock");
  const [hasUsedSafetyControl, setHasUsedSafetyControl] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPolicySaving, setIsPolicySaving] = useState(false);
  const [policySaveMessage, setPolicySaveMessage] = useState<string | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingStage, setFundingStage] = useState<FundingStage>("idle");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isWrapping, setIsWrapping] = useState(false);
  const [wrapStage, setWrapStage] = useState<WrapStage>("idle");
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealStage, setRevealStage] = useState<RevealStage>("idle");
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [unwrapStage, setUnwrapStage] = useState<UnwrapStage>("idle");
  const [isSettling, setIsSettling] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const config = useConfig();
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const hasInitializedEffect = useRef(false);
  const policySaveInFlight = useRef(false);
  const hasHydratedPersistedRun = useRef(false);

  const walletConnected = mode === "mock" ? true : Boolean(isConnected && address);
  const walletSource: WalletSource = mode === "mock" ? "mock" : walletConnected ? "live" : "disconnected";
  const walletAddress = mode === "mock" ? demoVaultState.walletAddress : address ?? null;
  const networkSupported = mode === "mock" || chainId === SUPPORTED_CHAIN_ID;

  function appendActivity(item: ReturnType<typeof createActivity>) {
    setActivity((current) => normalizeActivity(current, item));
  }

  function resetLiveTransientState() {
    setTokenDiscovery(null);
    setTokenDiscoverySource(null);
    setResearch(null);
    setResearchExplanationState(null);
    setResearchRankSource(null);
    setResearchExplainSource(null);
    setRecommendation(null);
    setLastExecutedSymbol(null);
    setDecision(null);
    setSettlement(null);
    setConfidentialPosition(null);
    setFundingStage("idle");
    setWrapStage("idle");
    setRevealStage("idle");
    setUnwrapStage("idle");
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
      throw new Error("Switch the wallet to Arbitrum Sepolia Testnet before continuing.");
    }
    if (!publicClient) {
      throw new Error("Public client is not ready yet.");
    }
    if (!liveConfigReady) {
      throw new Error("Contract configuration is incomplete. Set the live contract env variables first.");
    }

    return {
      address,
      publicClient,
      policyVaultAddress: getPolicyVaultAddress(),
      executionGuardAddress: getExecutionGuardAddress()
    };
  }

  async function getLiveWalletClient(action: string, live = assertLiveMode(action)) {
    if (!connector) {
      throw new Error("Wallet connector is not ready yet.");
    }

    let connectorChainId: number | null = null;
    try {
      connectorChainId = await connector.getChainId();
    } catch {
      connectorChainId = null;
    }

    if (connectorChainId !== null && connectorChainId !== SUPPORTED_CHAIN_ID) {
      throw new Error(
        `Switch the wallet to Arbitrum Sepolia Testnet (chain id ${SUPPORTED_CHAIN_ID}) before continuing. The connected wallet is currently on chain id ${connectorChainId}.`
      );
    }

    try {
      return await getWalletClient(config, {
        account: live.address,
        chainId: SUPPORTED_CHAIN_ID,
        connector
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : null;
      if (details?.includes("does not match the connection's chain")) {
        throw new Error(
          `Switch the wallet to Arbitrum Sepolia Testnet (chain id ${SUPPORTED_CHAIN_ID}) before continuing.`
        );
      }
      throw new Error(
        details
          ? `Wallet client is still initializing. ${details}`
          : "Wallet client is still initializing. Wait a moment and try again."
      );
    }
  }

  async function sendWrite(params: {
    contractAddress: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) {
    const live = assertLiveMode(params.functionName);
    const walletClient = await getLiveWalletClient(params.functionName, live);
    const simulation = await live.publicClient.simulateContract({
      account: live.address,
      address: params.contractAddress,
      abi: params.abi as never,
      functionName: params.functionName as never,
      args: (params.args ?? []) as never
    });
    const txHash = await walletClient.writeContract(simulation.request);
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
    const walletClient = await getLiveWalletClient(action, live);
    if (!noxClientConfigReady) {
      throw new Error("Public Nox application contract config is missing. Live policy encryption is disabled.");
    }

    const noxClient = await createNoxClient({
      chainId: SUPPORTED_CHAIN_ID,
      applicationContractAddress: getNoxApplicationAddress(),
      gatewayUrl: publicEnv.NEXT_PUBLIC_NOX_HANDLE_GATEWAY_URL || undefined,
      handleContractAddress: publicEnv.NEXT_PUBLIC_NOX_HANDLE_CONTRACT_ADDRESS || undefined,
      subgraphUrl: publicEnv.NEXT_PUBLIC_NOX_HANDLE_SUBGRAPH_URL || undefined,
      viemClient: walletClient,
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
      setConfidentialPosition(null);
      setSystemPaused(false);
      setTopologyReady(false);
      setFundingStage("idle");
      return;
    }

    if (!networkSupported || !liveConfigReady) {
      setVault(createEmptyVault(address, chainId || SUPPORTED_CHAIN_ID));
      setExecutionWallet(createEmptyExecutionWallet());
      setConfidentialPosition(null);
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
      const sessionAsset = getSessionAssetConfig();
      const [sessionAssetBalanceRaw, sessionAssetAllowanceRaw] = await Promise.all([
        publicClient.readContract({
          address: sessionAsset.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address]
        }) as Promise<bigint>,
        publicClient.readContract({
          address: sessionAsset.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, executionGuardAddress]
        }) as Promise<bigint>
      ]);

      const ethPriceUsd = await fetchEthPriceUsd();
      const vaultBalanceEth = formatEthBalance(walletBalanceWei);
      const vaultBalanceUsd = ethPriceUsd === null ? null : Number((vaultBalanceEth * ethPriceUsd).toFixed(2));
      const executionBalanceEth = formatEthBalance(executionBalanceWei);
      const executionBalanceUsd =
        ethPriceUsd === null ? null : Number((executionBalanceEth * ethPriceUsd).toFixed(2));
      const sessionAssetBalance = tokenUnitsToNumber(sessionAssetBalanceRaw, sessionAsset.decimals);
      const sessionAssetAllowance = tokenUnitsToNumber(sessionAssetAllowanceRaw, sessionAsset.decimals);

      const policyRefs = toPolicyRefs(policyRefsTuple);
      const session = toSessionSnapshot(sessionTuple);
      const chainPolicy = buildEncryptedPolicyFromChain(policyRefs);

      setSystemPaused(paused);
      setVault({
        walletAddress: address,
        chainId: chainId || SUPPORTED_CHAIN_ID,
        networkLabel: "Arbitrum Sepolia Testnet",
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
        sessionAssetSymbol: sessionAsset.symbol,
        sessionAssetBalance,
        sessionAssetAllowance,
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
      const [
        guardAdmin,
        guardSessionAsset,
        guardSwapRouter,
        guardPoolFee,
        guardLastSwapToken,
        guardLastAmountOut,
        guardLastWrapToken,
        guardLastWrapWrapper,
        guardLastWrapAmount,
        guardLastWrapAmountHandle,
        guardLastWrapBalanceHandle
      ] = await Promise.all([
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
        }) as Promise<number>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "lastSwapToken"
        }) as Promise<`0x${string}`>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "lastAmountOut"
        }) as Promise<bigint>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "lastWrapToken"
        }) as Promise<`0x${string}`>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "lastWrapWrapper"
        }) as Promise<`0x${string}`>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "lastWrapAmount"
        }) as Promise<bigint>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "lastWrapAmountHandle"
        }) as Promise<`0x${string}`>,
        publicClient.readContract({
          address: executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "lastWrapBalanceHandle"
        }) as Promise<`0x${string}`>
      ]);

      if (guardPolicyVault.toLowerCase() !== policyVaultAddress.toLowerCase()) {
        throw new Error("ExecutionGuard is not wired to the configured PolicyVault address.");
      }
      if (guardSessionAsset.toLowerCase() !== sessionAsset.address.toLowerCase()) {
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

      const wrappedTokenConfig =
        !isZeroHex(guardLastWrapToken) ? maybeGetTokenConfigByAddress(guardLastWrapToken) : null;
      const swappedTokenConfig =
        !isZeroHex(guardLastSwapToken) ? maybeGetTokenConfigByAddress(guardLastSwapToken) : null;

      if (
        wrappedTokenConfig &&
        !isZeroHex(guardLastWrapBalanceHandle) &&
        !isZeroHex(guardLastWrapWrapper)
      ) {
        setConfidentialPosition((current) =>
          buildConfidentialPosition({
            symbol: wrappedTokenConfig.symbol,
            address: wrappedTokenConfig.address,
            wrapperAddress: guardLastWrapWrapper,
            publicAmount:
              guardLastWrapAmount > 0n
                ? formatPublicAmount(guardLastWrapAmount, wrappedTokenConfig.decimals)
                : current?.publicAmount ?? null,
            chainId: chainId || SUPPORTED_CHAIN_ID,
            encryptedAmountHandle: guardLastWrapAmountHandle,
            encryptedBalanceHandle: guardLastWrapBalanceHandle,
            wrapTxHash: current?.wrapTxHash ?? null,
            status:
              current?.status === "revealed"
                ? "revealed"
                : current?.status === "unwrapped"
                  ? "unwrapped"
                  : current?.status === "unwrap_pending"
                    ? "unwrap_pending"
                    : current?.status === "reveal_failed"
                      ? "reveal_failed"
                      : "wrapped",
            previous: current
          })
        );
      } else if (swappedTokenConfig && guardLastAmountOut > 0n) {
        const wrapperSupport = getConfidentialWrapperSupport(swappedTokenConfig.symbol, chainId || SUPPORTED_CHAIN_ID);
        setConfidentialPosition((current) =>
          buildConfidentialPosition({
            symbol: swappedTokenConfig.symbol,
            address: swappedTokenConfig.address,
            wrapperAddress: wrapperSupport.wrapperAddress,
            publicAmount: formatPublicAmount(guardLastAmountOut, swappedTokenConfig.decimals),
            chainId: chainId || SUPPORTED_CHAIN_ID,
            encryptedAmountHandle: null,
            encryptedBalanceHandle: null,
            wrapTxHash: current?.wrapTxHash ?? null,
            status: wrapperSupport.supported ? "not_wrapped" : "missing_wrapper",
            previous: current
          })
        );
      } else {
        setConfidentialPosition((current) =>
          current?.status === "unwrapped" ? current : null
        );
      }
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

      const wrapperUpdates: string[] = [];
      for (const token of getConfiguredDemoTokens()) {
        const support = getConfidentialWrapperSupport(token.symbol, SUPPORTED_CHAIN_ID);
        const currentWrapper = (await live.publicClient.readContract({
          address: live.executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "confidentialWrappers",
          args: [token.address]
        })) as `0x${string}`;

        if (support.supported && support.wrapperAddress && currentWrapper.toLowerCase() !== support.wrapperAddress.toLowerCase()) {
          const { txHash } = await sendWrite({
            contractAddress: live.executionGuardAddress,
            abi: executionGuardAbi,
            functionName: "setConfidentialWrapper",
            args: [token.address, support.wrapperAddress, true]
          });
          wrapperUpdates.push(txHash);
        }

        if (!support.supported && !isZeroHex(currentWrapper)) {
          const { txHash } = await sendWrite({
            contractAddress: live.executionGuardAddress,
            abi: executionGuardAbi,
            functionName: "setConfidentialWrapper",
            args: [token.address, "0x0000000000000000000000000000000000000000", false]
          });
          wrapperUpdates.push(txHash);
        }
      }

      if (wrapperUpdates.length > 0) {
        appendActivity(
          createActivity(
            "operator",
            "success",
            "Confidential wrappers synced",
            `Updated ${wrapperUpdates.length} wrapper mapping${wrapperUpdates.length === 1 ? "" : "s"} on ExecutionGuard.`
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
    if (policySaveInFlight.current) {
      throw new Error("Policy save is already in progress. Finish or reject the current wallet request before trying again.");
    }

    policySaveInFlight.current = true;
    setIsPolicySaving(true);
    setPolicySaveMessage("Preparing policy save...");

    try {
      setLastError(null);
      const configuredSymbols = new Set(getConfiguredDemoTokens().map((token) => token.symbol));
      const sanitizedPolicy: PrivatePolicyInput =
        configuredSymbols.size === 0
          ? nextPolicy
          : {
              ...nextPolicy,
              allowedTokens: nextPolicy.allowedTokens.filter((symbol) => configuredSymbols.has(symbol as never))
            };

      if (configuredSymbols.size > 0 && sanitizedPolicy.allowedTokens.length === 0) {
        throw new Error("No live token addresses are configured for the current policy. Add at least one supported token.");
      }

      if (mode === "mock") {
        setPolicySaveMessage("Creating dev-only mock policy handles...");
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

        setPolicy(sanitizedPolicy);
        setEncryptedPolicy({
          policyId: `mock-${crypto.randomUUID()}`,
          encryptedAt: new Date().toISOString(),
          network: "Mock",
          handleVersion: "mock-v1",
          publicSummary: {
            allowedTokens: sanitizedPolicy.allowedTokens,
            allowedProtocol: sanitizedPolicy.allowedProtocol,
            oneTradePerDay: sanitizedPolicy.oneTradePerDay,
            sessionExpiryHours: sanitizedPolicy.sessionExpiryHours,
            autoExecuteEnabled: sanitizedPolicy.autoExecuteEnabled
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
        return;
      }

      const live = assertLiveMode("Policy save");
      setPolicySaveMessage("Preparing Nox encryption client...");
      const noxClient = await createLiveNoxHandleClient("Policy save");

      const policyId = `policy-${crypto.randomUUID()}`;
      setPolicySaveMessage("Encrypting daily budget handle...");
      const dailyBudgetField = await encryptUint256(noxClient, "dailyBudgetUsd", sanitizedPolicy.dailyBudgetUsd);
      setPolicySaveMessage("Encrypting confidence threshold handle...");
      const minConfidenceField = await encryptUint256(noxClient, "minConfidenceScore", sanitizedPolicy.minConfidenceScore);
      setPolicySaveMessage("Encrypting slippage handle...");
      const maxSlippageField = await encryptUint256(noxClient, "maxSlippageBps", sanitizedPolicy.maxSlippageBps);
      setPolicySaveMessage("Encrypting auto-execute flag...");
      const autoExecuteField = await encryptBool(noxClient, "autoExecuteEnabled", sanitizedPolicy.autoExecuteEnabled);
      const encryptedFields = [dailyBudgetField, minConfidenceField, maxSlippageField, autoExecuteField];
      const dailyBudgetProof = encryptedFields[0].proof;
      if (!dailyBudgetProof) {
        throw new Error("Nox daily budget encryption did not return a handle proof.");
      }
      const minConfidenceProof = encryptedFields[1].proof;
      if (!minConfidenceProof) {
        throw new Error("Nox min-confidence encryption did not return a handle proof.");
      }

      const whitelistRoot = computeWhitelistRoot(sanitizedPolicy.allowedTokens);
      const metadataUri = encodePolicyMetadata({
        policyId,
        allowedTokens: sanitizedPolicy.allowedTokens,
        oneTradePerDay: sanitizedPolicy.oneTradePerDay,
        sessionExpiryHours: sanitizedPolicy.sessionExpiryHours,
        autoExecuteEnabled: sanitizedPolicy.autoExecuteEnabled
      });

      setPolicySaveMessage("Confirm policy update in your wallet...");
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
          sanitizedPolicy.allowedProtocol,
          metadataUri
        ]
      });

      setPolicySaveMessage("Checking guard whitelist sync...");
      const currentSyncedWhitelistRoot = (await live.publicClient.readContract({
        address: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "syncedWhitelistRoot"
      })) as string;
      let syncTxHash: string | null = null;
      if (currentSyncedWhitelistRoot.toLowerCase() !== whitelistRoot.toLowerCase()) {
        setPolicySaveMessage("Confirm guard whitelist sync in your wallet...");
        const { txHash } = await sendWrite({
          contractAddress: live.executionGuardAddress,
          abi: executionGuardAbi,
          functionName: "syncPolicyWhitelistRoot"
        });
        syncTxHash = txHash;
      }

      const tokenUniverse = new Set([
        ...getConfiguredDemoTokens().map((token) => token.symbol),
        ...(encryptedPolicy?.publicSummary.allowedTokens ?? []),
        ...sanitizedPolicy.allowedTokens
      ]);
      const allowlistTxHashes: string[] = [];
      const wrapperTxHashes: string[] = [];

      for (const symbol of tokenUniverse) {
        let configuredToken;
        try {
          configuredToken = getTokenConfig(symbol);
        } catch {
          continue;
        }

        const desiredAllowed = sanitizedPolicy.allowedTokens.includes(symbol);
        const symbolHash = tokenHash(symbol);
        const wrapperSupport = getConfidentialWrapperSupport(symbol, SUPPORTED_CHAIN_ID);
        setPolicySaveMessage(`Checking ${symbol} guard allowlist...`);
        const [currentHashAllowed, currentAddressAllowed, currentWrapper] = await Promise.all([
          live.publicClient.readContract({
            address: live.executionGuardAddress,
            abi: executionGuardAbi,
            functionName: "allowedTokenHashes",
            args: [symbolHash]
          }) as Promise<boolean>,
          live.publicClient.readContract({
            address: live.executionGuardAddress,
            abi: executionGuardAbi,
            functionName: "allowedTokenAddresses",
            args: [configuredToken.address]
          }) as Promise<boolean>,
          live.publicClient.readContract({
            address: live.executionGuardAddress,
            abi: executionGuardAbi,
            functionName: "confidentialWrappers",
            args: [configuredToken.address]
          }) as Promise<`0x${string}`>
        ]);

        if (currentHashAllowed !== desiredAllowed) {
          setPolicySaveMessage(`Confirm ${symbol} token-reference update in your wallet...`);
          const { txHash } = await sendWrite({
            contractAddress: live.executionGuardAddress,
            abi: executionGuardAbi,
            functionName: "setAllowedToken",
            args: [symbolHash, desiredAllowed]
          });
          allowlistTxHashes.push(txHash);
        }

        if (currentAddressAllowed !== desiredAllowed) {
          setPolicySaveMessage(`Confirm ${symbol} token-address update in your wallet...`);
          const { txHash } = await sendWrite({
            contractAddress: live.executionGuardAddress,
            abi: executionGuardAbi,
            functionName: "setAllowedTokenAddress",
            args: [configuredToken.address, desiredAllowed]
          });
          allowlistTxHashes.push(txHash);
        }

        if (desiredAllowed && wrapperSupport.supported && wrapperSupport.wrapperAddress) {
          if (currentWrapper.toLowerCase() !== wrapperSupport.wrapperAddress.toLowerCase()) {
            setPolicySaveMessage(`Confirm ${symbol} confidential wrapper update in your wallet...`);
            const { txHash } = await sendWrite({
              contractAddress: live.executionGuardAddress,
              abi: executionGuardAbi,
              functionName: "setConfidentialWrapper",
              args: [configuredToken.address, wrapperSupport.wrapperAddress, true]
            });
            wrapperTxHashes.push(txHash);
          }
        } else if (!isZeroHex(currentWrapper)) {
          setPolicySaveMessage(`Confirm ${symbol} confidential wrapper removal in your wallet...`);
          const { txHash } = await sendWrite({
            contractAddress: live.executionGuardAddress,
            abi: executionGuardAbi,
            functionName: "setConfidentialWrapper",
            args: [configuredToken.address, "0x0000000000000000000000000000000000000000", false]
          });
          wrapperTxHashes.push(txHash);
        }
      }

      const nextEncryptedPolicy: EncryptedPolicyPayload = {
        policyId,
        encryptedAt: new Date().toISOString(),
        network: "Arbitrum Sepolia Testnet",
        handleVersion: "nox-live-v1",
        publicSummary: {
          allowedTokens: sanitizedPolicy.allowedTokens,
          allowedProtocol: sanitizedPolicy.allowedProtocol,
          oneTradePerDay: sanitizedPolicy.oneTradePerDay,
          sessionExpiryHours: sanitizedPolicy.sessionExpiryHours,
          autoExecuteEnabled: sanitizedPolicy.autoExecuteEnabled
        },
        encryptedFields
      };

      setPolicy(sanitizedPolicy);
      setEncryptedPolicy(nextEncryptedPolicy);
      setResearch(null);
      setRecommendation(null);
      setResearchExplanationState(null);
      setTokenDiscovery(null);
      setTokenDiscoverySource(null);
      setResearchRankSource(null);
      setResearchExplainSource(null);
      setDecision(null);
      setSettlement(null);
      setLastExecutedSymbol(null);
      setConfidentialPosition(null);
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
          `${describeWriteAction(updateTxHash, "PolicyVault.updatePolicyWithNox")}${
            syncTxHash ? ` Then synced the guard whitelist root in tx ${syncTxHash}.` : " Guard whitelist root was already in sync."
          }${
            allowlistTxHashes.length > 0
              ? ` Updated ${allowlistTxHashes.length} guard allowlist setting${allowlistTxHashes.length === 1 ? "" : "s"}.`
              : " Guard token allowlist was already up to date."
          }${
            wrapperTxHashes.length > 0
              ? ` Updated ${wrapperTxHashes.length} confidential wrapper mapping${wrapperTxHashes.length === 1 ? "" : "s"}.`
              : " Confidential wrapper mappings were already in sync."
          }`
        )
      );
      setPolicySaveMessage("Refreshing live policy state...");
      await refreshFromChain();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save live policy.";
      setLastError(message);
      appendActivity(createActivity("system", "error", "Policy save failed", message));
      throw error;
    } finally {
      policySaveInFlight.current = false;
      setPolicySaveMessage(null);
      setIsPolicySaving(false);
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

  function setTokenDiscoveryResult(
    nextDiscovery: TokenDiscoveryResponse,
    source: Exclude<ResearchSource, null> = "agent"
  ) {
    setTokenDiscovery(nextDiscovery);
    setTokenDiscoverySource(source);
    setResearch(null);
    setResearchExplanationState(null);
    setResearchRankSource(null);
    setResearchExplainSource(null);
    setDecision(null);
    appendActivity(
      createActivity(
        source === "mock" ? "system" : "research-agent",
        source === "mock" ? "warning" : "success",
        "Token discovery received",
        `${nextDiscovery.candidates.length} ${nextDiscovery.category} candidates were discovered across ${nextDiscovery.chains.join(", ")}.`
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
    const wrapperSupport =
      recommendation && (!recommendation.execution_status || recommendation.execution_status === "executable")
        ? getConfidentialWrapperSupport(recommendation.symbol, chainId ?? SUPPORTED_CHAIN_ID)
        : null;
    const nextDecision = evaluateExecution({
      mode,
      paused: systemPaused,
      policy,
      recommendation,
      vault,
      executionWallet,
      wrapperReady: wrapperSupport?.supported,
      wrapperReason: wrapperSupport?.reason ?? null
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
        sessionAssetSymbol: current.sessionAssetSymbol ?? "USDC",
        sessionAssetBalance: Math.max((current.sessionAssetBalance ?? policy.dailyBudgetUsd) - policy.dailyBudgetUsd, 0),
        sessionAssetAllowance: current.sessionAssetAllowance ?? policy.dailyBudgetUsd,
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
      setConfidentialPosition({
        ...mockConfidentialPosition,
        status: "not_wrapped",
        wrapTxHash: null,
        encryptedAmountHandle: null,
        encryptedBalanceHandle: null,
        decryptedBalance: null,
        revealError: null,
        unwrapRequestHandle: null,
        unwrapTxHash: null,
        finalizeUnwrapTxHash: null
      });
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
      const wrapperSupport = getConfidentialWrapperSupport(outputToken.symbol, SUPPORTED_CHAIN_ID);
      setConfidentialPosition((current) =>
        buildConfidentialPosition({
          symbol: outputToken.symbol,
          address: outputToken.address,
          wrapperAddress: wrapperSupport.wrapperAddress,
          publicAmount: formatPublicAmount(actualAmountOut, outputToken.decimals),
          chainId: SUPPORTED_CHAIN_ID,
          encryptedAmountHandle: null,
          encryptedBalanceHandle: null,
          wrapTxHash: null,
          status: wrapperSupport.supported ? "not_wrapped" : "missing_wrapper",
          previous: current
        })
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

  async function wrapAcquiredPosition() {
    const targetSymbol = confidentialPosition?.underlyingSymbol ?? lastExecutedSymbol ?? recommendation?.symbol ?? null;
    if (!targetSymbol) {
      const message = "Execute the guarded swap first so there is an acquired ERC-20 position to wrap.";
      setLastError(message);
      appendActivity(createActivity("execution-layer", "warning", "Wrap blocked", message));
      throw new Error(message);
    }

    setIsWrapping(true);
    setWrapStage("wrapping");

    if (mode === "mock") {
      setConfidentialPosition({
        ...mockConfidentialPosition,
        publicAmount: confidentialPosition?.publicAmount ?? mockConfidentialPosition.publicAmount,
        status: "wrapped"
      });
      appendActivity(
        createActivity(
          "execution-layer",
          "warning",
          "Mock confidential wrap recorded",
          "The acquired position was wrapped in dev-only mock mode."
        )
      );
      setWrapStage("wrapped");
      setIsWrapping(false);
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Confidential wrap");
      if (!executionWallet.sessionActive) {
        throw new Error("An active live session is required before wrapping the acquired position.");
      }

      const outputToken = getTokenConfig(targetSymbol);
      const wrapperSupport = getConfidentialWrapperSupport(outputToken.symbol, SUPPORTED_CHAIN_ID);
      if (!wrapperSupport.supported || !wrapperSupport.wrapperAddress) {
        throw new Error(wrapperSupport.reason ?? `No confidential wrapper is configured for ${outputToken.symbol}.`);
      }

      const amountToWrap = await readTokenBalance(outputToken.address, live.executionGuardAddress);
      if (amountToWrap === 0n) {
        throw new Error(`ExecutionGuard does not currently hold any ${outputToken.symbol} to wrap.`);
      }

      setConfidentialPosition((current) =>
        buildConfidentialPosition({
          symbol: outputToken.symbol,
          address: outputToken.address,
          wrapperAddress: wrapperSupport.wrapperAddress,
          publicAmount: formatPublicAmount(amountToWrap, outputToken.decimals),
          chainId: SUPPORTED_CHAIN_ID,
          encryptedAmountHandle: current?.encryptedAmountHandle ?? null,
          encryptedBalanceHandle: current?.encryptedBalanceHandle ?? null,
          wrapTxHash: current?.wrapTxHash ?? null,
          status: "wrapping",
          previous: current
        })
      );

      const { txHash, result } = await sendWrite({
        contractAddress: live.executionGuardAddress,
        abi: executionGuardAbi,
        functionName: "wrapLastOutput",
        args: [outputToken.address, amountToWrap, createExecutionReference("execution", `${outputToken.symbol}-wrap`)]
      });

      const wrapResult = Array.isArray(result)
        ? (result as readonly [`0x${string}`, `0x${string}`])
        : null;

      setConfidentialPosition((current) =>
        buildConfidentialPosition({
          symbol: outputToken.symbol,
          address: outputToken.address,
          wrapperAddress: wrapperSupport.wrapperAddress,
          publicAmount: formatPublicAmount(amountToWrap, outputToken.decimals),
          chainId: SUPPORTED_CHAIN_ID,
          encryptedAmountHandle: wrapResult?.[0] ?? current?.encryptedAmountHandle ?? null,
          encryptedBalanceHandle: wrapResult?.[1] ?? current?.encryptedBalanceHandle ?? null,
          wrapTxHash: txHash,
          status: "wrapped",
          previous: current
        })
      );
      setWrapStage("wrapped");
      appendActivity(
        createActivity(
          "execution-layer",
          "success",
          "Confidential wrap completed",
          `${describeWriteAction(txHash, "ExecutionGuard.wrapLastOutput")} Wrapped the acquired ${outputToken.symbol} position into ${wrapperSupport.wrapperAddress}.`
        )
      );
      await refreshFromChain();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to wrap the acquired position.";
      setLastError(message);
      setConfidentialPosition((current) =>
        current
          ? {
              ...current,
              status: current.wrapperAddress ? "not_wrapped" : "missing_wrapper",
              revealError: message
            }
          : current
      );
      appendActivity(createActivity("system", "error", "Confidential wrap failed", message));
      throw error;
    } finally {
      setWrapStage("idle");
      setIsWrapping(false);
    }
  }

  async function revealConfidentialBalance() {
    const handle = confidentialPosition?.encryptedBalanceHandle;
    if (!handle || !confidentialPosition) {
      const message = "Wrap the acquired position first so there is a confidential balance handle to reveal.";
      setLastError(message);
      appendActivity(createActivity("execution-layer", "warning", "Reveal blocked", message));
      throw new Error(message);
    }

    setIsRevealing(true);
    setRevealStage("revealing");

    if (mode === "mock") {
      setConfidentialPosition({
        ...mockConfidentialPosition,
        publicAmount: confidentialPosition.publicAmount,
        status: "revealed"
      });
      appendActivity(
        createActivity(
          "execution-layer",
          "warning",
          "Mock confidential balance revealed",
          "The owner-only reveal path ran in dev-only mock mode."
        )
      );
      setIsRevealing(false);
      setRevealStage("idle");
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Confidential reveal");
      const noxClient = await createLiveNoxHandleClient("Confidential reveal");
      const acl = await getHandleAcl(noxClient, handle);
      const lowerAddress = live.address.toLowerCase();
      const canDecrypt =
        acl.isPublic ||
        acl.admins.some((entry) => entry.toLowerCase() === lowerAddress) ||
        acl.viewers.some((entry) => entry.toLowerCase() === lowerAddress);

      if (!canDecrypt) {
        throw new Error("The connected wallet is not permitted to reveal this confidential balance handle.");
      }

      const decryptedBalance = await decryptHandle(noxClient, "confidentialBalance", handle);
      setConfidentialPosition((current) =>
        current
          ? {
              ...current,
              viewerAclState: {
                isPublic: acl.isPublic,
                admins: acl.admins,
                viewers: acl.viewers,
                canDecrypt,
                checkedAt: new Date().toISOString()
              },
              decryptedBalance,
              revealError: null,
              status: "revealed"
            }
          : current
      );
      appendActivity(
        createActivity(
          "execution-layer",
          "success",
          "Confidential balance revealed",
          `Owner-only reveal succeeded for the ${confidentialPosition.underlyingSymbol} confidential position handle.`
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reveal the confidential balance.";
      setLastError(message);
      setConfidentialPosition((current) =>
        current
          ? {
              ...current,
              revealError: message,
              status: "reveal_failed"
            }
          : current
      );
      appendActivity(createActivity("system", "error", "Confidential reveal failed", message));
      throw error;
    } finally {
      setIsRevealing(false);
      setRevealStage("idle");
    }
  }

  async function unwrapConfidentialPosition() {
    if (!confidentialPosition?.wrapperAddress || !confidentialPosition.encryptedBalanceHandle) {
      const message = "A wrapped confidential position is required before unwrap can start.";
      setLastError(message);
      appendActivity(createActivity("execution-layer", "warning", "Unwrap blocked", message));
      throw new Error(message);
    }

    setIsUnwrapping(true);
    setUnwrapStage("requesting");

    if (mode === "mock") {
      setConfidentialPosition({
        ...mockConfidentialPosition,
        publicAmount: confidentialPosition.publicAmount,
        status: "unwrapped",
        unwrapRequestHandle: "0xmock-unwrap",
        unwrapTxHash: "0xmock-unwrap-tx",
        finalizeUnwrapTxHash: "0xmock-finalize-tx"
      });
      appendActivity(
        createActivity(
          "execution-layer",
          "warning",
          "Mock confidential unwrap recorded",
          "The unwrap path ran in dev-only mock mode."
        )
      );
      setIsUnwrapping(false);
      setUnwrapStage("idle");
      return;
    }

    try {
      setLastError(null);
      const live = assertLiveMode("Confidential unwrap");
      const noxClient = await createLiveNoxHandleClient("Confidential unwrap");

      setConfidentialPosition((current) =>
        current
          ? {
              ...current,
              status: "unwrap_pending"
            }
          : current
      );

      const { txHash: unwrapTxHash, result } = await sendWrite({
        contractAddress: confidentialPosition.wrapperAddress as `0x${string}`,
        abi: confidentialWrapperAbi,
        functionName: "unwrap",
        args: [live.address, live.address, confidentialPosition.encryptedBalanceHandle]
      });

      const unwrapRequestHandle =
        (typeof result === "string" ? result : Array.isArray(result) ? result[0] : null) as `0x${string}` | null;
      if (!unwrapRequestHandle || isZeroHex(unwrapRequestHandle)) {
        throw new Error("The confidential wrapper did not return a valid unwrap request handle.");
      }

      setUnwrapStage("finalizing");
      const unwrapDecryption = await publicDecryptHandle(noxClient, unwrapRequestHandle);
      const { txHash: finalizeTxHash } = await sendWrite({
        contractAddress: confidentialPosition.wrapperAddress as `0x${string}`,
        abi: confidentialWrapperAbi,
        functionName: "finalizeUnwrap",
        args: [unwrapRequestHandle, unwrapDecryption.decryptionProof as `0x${string}`]
      });

      setConfidentialPosition((current) =>
        current
          ? {
              ...current,
              unwrapRequestHandle,
              unwrapTxHash,
              finalizeUnwrapTxHash: finalizeTxHash,
              decryptedBalance: unwrapDecryption.value,
              status: "unwrapped"
            }
          : current
      );
      appendActivity(
        createActivity(
          "execution-layer",
          "success",
          "Confidential unwrap finalized",
          `${describeWriteAction(unwrapTxHash, "Confidential wrapper unwrap")} Finalized the request in tx ${finalizeTxHash}.`
        )
      );
      await refreshFromChain();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to unwrap the confidential position.";
      setLastError(message);
      setConfidentialPosition((current) =>
        current
          ? {
              ...current,
              revealError: message,
              status: "reveal_failed"
            }
          : current
      );
      appendActivity(createActivity("system", "error", "Confidential unwrap failed", message));
      throw error;
    } finally {
      setIsUnwrapping(false);
      setUnwrapStage("idle");
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
      const wrappedPositionActive =
        confidentialPosition?.underlyingSymbol === outputSymbol &&
        confidentialPosition.status !== "not_wrapped" &&
        confidentialPosition.status !== "missing_wrapper";
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
        outputToken.symbol === sessionAsset.symbol || wrappedPositionActive
          ? []
          : ([outputToken.address] as `0x${string}`[]);
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
          wrappedPositionActive
            ? confidentialPosition?.status === "unwrapped"
              ? `The active session was closed on-chain and the remaining ${sessionAsset.symbol} was swept back to the vault wallet. The ${outputToken.symbol} position had already been unwrapped to the owner wallet.`
              : `The active session was closed on-chain and the remaining ${sessionAsset.symbol} was swept back to the vault wallet. The ${outputToken.symbol} position remains represented by the confidential wrapper.`
            : outputToken.symbol === sessionAsset.symbol
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
    if (hasHydratedPersistedRun.current || typeof window === "undefined") {
      return;
    }

    hasHydratedPersistedRun.current = true;
    if (mode !== "live") {
      setPersistenceReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(PERSISTED_RUN_KEY);
      if (!raw) {
        setPersistenceReady(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedRunState>;
      if (parsed.version !== 1) {
        window.localStorage.removeItem(PERSISTED_RUN_KEY);
        setPersistenceReady(true);
        return;
      }

      setTokenDiscovery(parsed.tokenDiscovery ?? null);
      setTokenDiscoverySource(parsed.tokenDiscoverySource ?? null);
      setResearch(parsed.research ?? null);
      setResearchRankSource(parsed.researchRankSource ?? null);
      setResearchExplanationState(parsed.researchExplanation ?? null);
      setResearchExplainSource(parsed.researchExplainSource ?? null);
      setRecommendation(parsed.recommendation ?? parsed.research?.bestCandidate ?? null);
      setDecision(parsed.decision ?? null);
      setSettlement(parsed.settlement ?? null);
      setConfidentialPosition(parsed.confidentialPosition ?? null);
      setActivity((parsed.activity ?? []).slice(0, 20));
    } catch {
      window.localStorage.removeItem(PERSISTED_RUN_KEY);
    } finally {
      setPersistenceReady(true);
    }
  }, [mode]);

  useEffect(() => {
    if (!persistenceReady || mode !== "live" || typeof window === "undefined") {
      return;
    }

    const payload: PersistedRunState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      tokenDiscovery,
      tokenDiscoverySource,
      research,
      researchRankSource,
      researchExplanation,
      researchExplainSource,
      recommendation,
      decision,
      settlement,
      confidentialPosition,
      activity
    };

    window.localStorage.setItem(PERSISTED_RUN_KEY, JSON.stringify(payload));
  }, [
    persistenceReady,
    mode,
    tokenDiscovery,
    tokenDiscoverySource,
    research,
    researchRankSource,
    researchExplanation,
    researchExplainSource,
    recommendation,
    decision,
    settlement,
    confidentialPosition,
    activity
  ]);

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
      setConfidentialPosition(null);
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
          : "Connected wallet is on the wrong network. Switch to Arbitrum Sepolia Testnet."
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
        tokenDiscovery,
        researchExplanation,
        tokenDiscoverySource,
        researchRankSource,
        researchExplainSource,
        recommendation,
        decision,
        settlement,
        confidentialPosition,
        activity,
        lastError,
        isInitializing,
        isPolicySaving,
        policySaveMessage,
        isFunding,
        fundingStage,
        isExecuting,
        isWrapping,
        wrapStage,
        isRevealing,
        revealStage,
        isUnwrapping,
        unwrapStage,
        isSettling,
        isPausing,
        setMode,
        initializeTopology,
        savePolicy,
        setTokenDiscoveryResult,
        setResearchResult,
        setResearchExplanation,
        evaluateDecision: evaluateDecisionAction,
        fundExecutionWallet,
        executeTrade,
        wrapAcquiredPosition,
        revealConfidentialBalance,
        unwrapConfidentialPosition,
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
