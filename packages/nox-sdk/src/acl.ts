import type { NoxAclView, NoxClient } from "./client.js";

export async function getHandleAcl(client: NoxClient, handle: string): Promise<NoxAclView> {
  return client.getAcl(handle);
}
