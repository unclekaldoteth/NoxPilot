import {
  createEthersHandleClient,
  createViemHandleClient,
  type ACL as HandleAcl,
  type EthersClient,
  type EthereumAddress,
  type HandleClient as LiveHandleClient,
  type HandleClientConfig as LiveHandleClientConfig
} from "@iexec-nox/handle";
import { isAddress, keccak256, toHex, type WalletClient } from "viem";

export type NoxClientMode = "mock" | "live";

export type NormalizedHandle = {
  field: string;
  handle: string;
  proof?: string;
  preview: string;
  mode: NoxClientMode;
  raw?: unknown;
};

export type NoxAclView = {
  handle: string;
  isPublic: boolean;
  admins: string[];
  viewers: string[];
  mode: NoxClientMode;
  raw?: unknown;
};

export type NoxPublicDecryption = {
  handle: string;
  value: string;
  solidityType: string;
  decryptionProof: string;
  mode: NoxClientMode;
  raw?: unknown;
};

export type NoxClientConfig = {
  chainId?: number;
  enableMockFallback?: boolean;
  applicationContractAddress?: string;
  gatewayUrl?: string;
  handleContractAddress?: string;
  subgraphUrl?: string;
  viemClient?: WalletClient;
  ethersClient?: EthersClient;

  // Backward-compatible aliases kept for the hackathon wrapper. These are not
  // official @iexec-nox/handle config keys.
  signer?: EthersClient;
  policyContractAddress?: string;
  rpcUrl?: string;
  aclContractAddress?: string;
};

type ResolvedNoxClientConfig = Required<Pick<NoxClientConfig, "chainId" | "enableMockFallback">> &
  Omit<NoxClientConfig, "chainId" | "enableMockFallback">;

export type NoxClient = {
  mode: NoxClientMode;
  config: ResolvedNoxClientConfig;
  encryptNumber: (field: string, value: bigint | number) => Promise<NormalizedHandle>;
  encryptFlag: (field: string, value: boolean) => Promise<NormalizedHandle>;
  decrypt: (field: string, handle: string) => Promise<string>;
  publicDecrypt: (handle: string) => Promise<NoxPublicDecryption>;
  getAcl: (handle: string) => Promise<NoxAclView>;
  rawClient: LiveHandleClient | null;
};

const DEFAULT_CHAIN_ID = 421614;

function createMockHandle(field: string, value: string): string {
  return keccak256(toHex(`${field}:${value}:${Date.now().toString(36)}`));
}

function resolveConfig(input: NoxClientConfig): ResolvedNoxClientConfig {
  return {
    chainId: input.chainId ?? DEFAULT_CHAIN_ID,
    enableMockFallback: input.enableMockFallback ?? true,
    applicationContractAddress: input.applicationContractAddress ?? input.policyContractAddress,
    gatewayUrl: input.gatewayUrl,
    handleContractAddress: input.handleContractAddress,
    subgraphUrl: input.subgraphUrl,
    viemClient: input.viemClient,
    ethersClient: input.ethersClient,
    signer: input.signer,
    policyContractAddress: input.policyContractAddress,
    rpcUrl: input.rpcUrl,
    aclContractAddress: input.aclContractAddress
  };
}

function buildMockClient(config: ResolvedNoxClientConfig): NoxClient {
  return {
    mode: "mock",
    config,
    rawClient: null,
    async encryptNumber(field, value) {
      const normalized = typeof value === "bigint" ? value.toString() : value.toFixed(0);
      return {
        field,
        handle: createMockHandle(field, normalized),
        preview: `${field} encrypted in mock mode`,
        mode: "mock"
      };
    },
    async encryptFlag(field, value) {
      return {
        field,
        handle: createMockHandle(field, value ? "true" : "false"),
        preview: `${field} encrypted in mock mode`,
        mode: "mock"
      };
    },
    async decrypt(_field, handle) {
      return `mock-decrypted:${handle.slice(0, 10)}`;
    },
    async publicDecrypt(handle) {
      return {
        handle,
        value: "true",
        solidityType: "bool",
        decryptionProof: `mock-proof:${handle.slice(0, 10)}`,
        mode: "mock"
      };
    },
    async getAcl(handle) {
      return {
        handle,
        isPublic: false,
        admins: [],
        viewers: [],
        mode: "mock"
      };
    }
  };
}

function resolveLiveTransport(config: ResolvedNoxClientConfig): WalletClient | EthersClient | null {
  return config.viemClient ?? config.ethersClient ?? config.signer ?? null;
}

function resolveSdkOverrides(config: ResolvedNoxClientConfig): Partial<LiveHandleClientConfig> | undefined {
  const hasAnyOverride = Boolean(config.gatewayUrl || config.handleContractAddress || config.subgraphUrl);
  if (!hasAnyOverride) {
    return undefined;
  }

  if (!config.gatewayUrl || !config.handleContractAddress || !config.subgraphUrl) {
    throw new Error(
      "Incomplete @iexec-nox/handle override config. Provide NOX_HANDLE_GATEWAY_URL, NOX_HANDLE_CONTRACT_ADDRESS, and NOX_HANDLE_SUBGRAPH_URL together."
    );
  }

  if (!isAddress(config.handleContractAddress)) {
    throw new Error(`Invalid NOX_HANDLE_CONTRACT_ADDRESS: ${config.handleContractAddress}`);
  }

  return {
    gatewayUrl: config.gatewayUrl as LiveHandleClientConfig["gatewayUrl"],
    smartContractAddress: config.handleContractAddress as EthereumAddress,
    subgraphUrl: config.subgraphUrl as LiveHandleClientConfig["subgraphUrl"]
  };
}

function resolveApplicationContract(config: ResolvedNoxClientConfig): EthereumAddress {
  if (!config.applicationContractAddress || !isAddress(config.applicationContractAddress)) {
    throw new Error(
      "Live @iexec-nox/handle encryption requires a valid application contract address. Set NOX_APPLICATION_CONTRACT_ADDRESS or NOX_POLICY_CONTRACT_ADDRESS."
    );
  }

  return config.applicationContractAddress as EthereumAddress;
}

async function createLiveHandleSdkClient(config: ResolvedNoxClientConfig): Promise<LiveHandleClient> {
  const transport = resolveLiveTransport(config);
  const overrides = resolveSdkOverrides(config);

  if (!transport) {
    throw new Error(
      "Live @iexec-nox/handle mode requires a wallet-backed viem client or ethers signer/provider. RPC-only configuration is not enough."
    );
  }

  if (config.viemClient) {
    return createViemHandleClient(config.viemClient, overrides);
  }

  return createEthersHandleClient(transport as EthersClient, overrides);
}

async function encryptWithLiveClient(
  handleClient: LiveHandleClient,
  field: string,
  kind: "uint256" | "bool",
  value: bigint | boolean,
  applicationContract: EthereumAddress
): Promise<NormalizedHandle> {
  const result = await handleClient.encryptInput(value as never, kind, applicationContract);
  return {
    field,
    handle: result.handle,
    proof: result.handleProof,
    preview: `${field} encrypted through @iexec-nox/handle`,
    mode: "live",
    raw: result
  };
}

async function decryptWithLiveClient(handleClient: LiveHandleClient, handle: string): Promise<string> {
  const result = await handleClient.decrypt(handle as `0x${string}`);
  return typeof result.value === "bigint" ? result.value.toString() : String(result.value);
}

async function publicDecryptWithLiveClient(
  handleClient: LiveHandleClient,
  handle: string
): Promise<NoxPublicDecryption> {
  const result = await handleClient.publicDecrypt(handle as `0x${string}`);
  return {
    handle,
    value: typeof result.value === "bigint" ? result.value.toString() : String(result.value),
    solidityType: result.solidityType,
    decryptionProof: result.decryptionProof,
    mode: "live",
    raw: result
  };
}

function normalizeAcl(handle: string, acl: HandleAcl, mode: NoxClientMode): NoxAclView {
  return {
    handle,
    isPublic: acl.isPublic,
    admins: acl.admins,
    viewers: acl.viewers,
    mode,
    raw: acl
  };
}

export async function createNoxClient(input: NoxClientConfig = {}): Promise<NoxClient> {
  const config = resolveConfig(input);
  const liveTransport = resolveLiveTransport(config);
  const hasApplicationContract = Boolean(config.applicationContractAddress);

  if (!liveTransport || !hasApplicationContract) {
    return buildMockClient(config);
  }

  try {
    const applicationContract = resolveApplicationContract(config);
    const liveClient = await createLiveHandleSdkClient(config);

    return {
      mode: "live",
      config,
      rawClient: liveClient,
      async encryptNumber(field, value) {
        try {
          return await encryptWithLiveClient(liveClient, field, "uint256", BigInt(value), applicationContract);
        } catch (error) {
          if (!config.enableMockFallback) {
            throw error;
          }
          return buildMockClient(config).encryptNumber(field, value);
        }
      },
      async encryptFlag(field, value) {
        try {
          return await encryptWithLiveClient(liveClient, field, "bool", value, applicationContract);
        } catch (error) {
          if (!config.enableMockFallback) {
            throw error;
          }
          return buildMockClient(config).encryptFlag(field, value);
        }
      },
      async decrypt(field, handle) {
        try {
          return await decryptWithLiveClient(liveClient, handle);
        } catch (error) {
          if (!config.enableMockFallback) {
            throw error;
          }
          return buildMockClient(config).decrypt(field, handle);
        }
      },
      async publicDecrypt(handle) {
        try {
          return await publicDecryptWithLiveClient(liveClient, handle);
        } catch (error) {
          if (!config.enableMockFallback) {
            throw error;
          }
          return buildMockClient(config).publicDecrypt(handle);
        }
      },
      async getAcl(handle) {
        try {
          const acl = await liveClient.viewACL(handle as `0x${string}`);
          return normalizeAcl(handle, acl, "live");
        } catch (error) {
          if (!config.enableMockFallback) {
            throw error;
          }
          return buildMockClient(config).getAcl(handle);
        }
      }
    };
  } catch (error) {
    if (!config.enableMockFallback) {
      throw error;
    }
    return buildMockClient(config);
  }
}

/*
  This wrapper intentionally stays small and honest. The official
  @iexec-nox/handle SDK creates wallet-backed Handle clients via
  createViemHandleClient() or createEthersHandleClient(), then exposes
  encryptInput(), decrypt(), publicDecrypt(), and viewACL(). NoxPilot keeps a
  normalized surface over those methods and falls back to mock mode when a real
  wallet client or application contract is not available.
*/
