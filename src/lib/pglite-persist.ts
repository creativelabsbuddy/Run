import { BlobNotFoundError, BlobPreconditionFailedError, get, head, put } from "@vercel/blob";
import type { PGlite } from "@electric-sql/pglite";

const DUMP = "run-pglite.tar.gz";

const slot = globalThis as typeof globalThis & { __pgliteBlobEtag?: string; __pgliteBlobChain?: Promise<void> };

function enabled(): boolean {
  return Boolean(process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN);
}

export async function loadPgliteDump(): Promise<Blob | undefined> {
  if (!enabled()) return undefined;
  const found = await get(DUMP, { access: "private", useCache: false }).catch(() => null);
  if (!found || found.statusCode !== 200 || !found.stream) return undefined;
  slot.__pgliteBlobEtag = found.blob.etag;
  const bytes = new Uint8Array(await new Response(found.stream).arrayBuffer());
  return new Blob([bytes]);
}

function isWrite(sql: string): boolean {
  return /^(insert|update|delete|create|alter|drop|commit)\b/i.test(sql.trim());
}

export function persistPglite(pg: PGlite, sql: string): Promise<void> {
  if (!enabled() || !isWrite(sql)) return Promise.resolve();
  if (pg.isInTransaction() && !/^commit\b/i.test(sql.trim())) return Promise.resolve();
  const chain = (slot.__pgliteBlobChain ?? Promise.resolve()).then(() => writeDump(pg));
  slot.__pgliteBlobChain = chain.catch(() => undefined);
  return chain;
}

async function writeDump(pg: PGlite): Promise<void> {
  let remoteEtag = "";
  try {
    remoteEtag = (await head(DUMP)).etag;
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) throw error;
  }
  if (remoteEtag && !slot.__pgliteBlobEtag) return;
  const dump = await pg.dumpDataDir("gzip");
  try {
    const saved = await put(DUMP, dump, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/gzip",
      cacheControlMaxAge: 60,
      ...(slot.__pgliteBlobEtag ? { ifMatch: slot.__pgliteBlobEtag } : {}),
    });
    slot.__pgliteBlobEtag = saved.etag;
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) return;
    throw error;
  }
}
