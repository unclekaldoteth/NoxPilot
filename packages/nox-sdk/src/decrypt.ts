import type { NoxClient, NoxPublicDecryption } from "./client.js";

export async function decryptHandle(client: NoxClient, field: string, handle: string): Promise<string> {
  return client.decrypt(field, handle);
}

export async function publicDecryptHandle(client: NoxClient, handle: string): Promise<NoxPublicDecryption> {
  return client.publicDecrypt(handle);
}
