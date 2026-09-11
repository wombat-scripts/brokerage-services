import { createBitwardenVaultFromEnv } from "@wombat/bitwarden-vault";
import { createNotionAdapterFromEnv } from "@wombat/notion-adapter";
import { createMemoryStore, createPgPool, createPostgresStore, type BrokerageStore } from "@wombat/store";

export function createWorkerStore(): { store: BrokerageStore; close?: () => Promise<void> } {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { store: createMemoryStore() };
  }
  const pool = createPgPool(databaseUrl);
  return {
    store: createPostgresStore(pool),
    close: async () => {
      await pool.end();
    },
  };
}

export function createWorkerAdapters() {
  return {
    crm: createNotionAdapterFromEnv(),
    vault: createBitwardenVaultFromEnv(),
  };
}
