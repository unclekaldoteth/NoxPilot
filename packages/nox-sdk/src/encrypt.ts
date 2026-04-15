import type { NoxClient, NormalizedHandle } from "./client.js";

export async function encryptUint256(
  client: NoxClient,
  field: string,
  value: number | bigint
): Promise<NormalizedHandle> {
  return client.encryptNumber(field, value);
}

export async function encryptBool(client: NoxClient, field: string, value: boolean): Promise<NormalizedHandle> {
  return client.encryptFlag(field, value);
}
