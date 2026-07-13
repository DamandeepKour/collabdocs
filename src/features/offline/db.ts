/**
 * IndexedDB local-first store — ALWAYS the client source of truth.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { APP_CONFIG } from "@/config/app";
import type { LocalDocument, SyncOperation } from "@/types";

interface CollabDocsDb extends DBSchema {
  documents: {
    key: string;
    value: LocalDocument;
    indexes: { "by-updated": string };
  };
  syncQueue: {
    key: string;
    value: SyncOperation;
    indexes: { "by-document": string };
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbPromise: Promise<IDBPDatabase<CollabDocsDb>> | null = null;

export function getLocalDb() {
  if (!dbPromise) {
    dbPromise = openDB<CollabDocsDb>(APP_CONFIG.localDbName, APP_CONFIG.localDbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("documents")) {
          const docs = db.createObjectStore("documents", { keyPath: "id" });
          docs.createIndex("by-updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          const q = db.createObjectStore("syncQueue", { keyPath: "id" });
          q.createIndex("by-document", "documentId");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export const localDocumentStore = {
  async list(): Promise<LocalDocument[]> {
    const db = await getLocalDb();
    const all = await db.getAll("documents");
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async get(id: string): Promise<LocalDocument | undefined> {
    const db = await getLocalDb();
    return db.get("documents", id);
  },

  async put(doc: LocalDocument): Promise<void> {
    const db = await getLocalDb();
    await db.put("documents", doc);
  },

  async remove(id: string): Promise<void> {
    const db = await getLocalDb();
    await db.delete("documents", id);
  },
};

export const localSyncQueue = {
  async enqueue(op: SyncOperation): Promise<void> {
    const db = await getLocalDb();
    await db.put("syncQueue", op);
  },

  async list(): Promise<SyncOperation[]> {
    const db = await getLocalDb();
    return db.getAll("syncQueue");
  },

  async listForDocument(documentId: string): Promise<SyncOperation[]> {
    const db = await getLocalDb();
    return db.getAllFromIndex("syncQueue", "by-document", documentId);
  },

  async remove(id: string): Promise<void> {
    const db = await getLocalDb();
    await db.delete("syncQueue", id);
  },

  async update(op: SyncOperation): Promise<void> {
    const db = await getLocalDb();
    await db.put("syncQueue", op);
  },
};

export async function setMeta(key: string, value: string) {
  const db = await getLocalDb();
  await db.put("meta", { key, value });
}

export async function getMeta(key: string) {
  const db = await getLocalDb();
  return (await db.get("meta", key))?.value;
}
