import "server-only";
import { assertProductionConfig, features } from "@/lib/env";
import { createMemoryStore } from "@/lib/store/memory";
import { createSupabaseStore } from "@/lib/store/supabase";
import type { ScamStore } from "@/lib/store/types";

let store: ScamStore | null = null;

export function getStore(): ScamStore {
  if (!store) {
    assertProductionConfig();
    store = features.supabase ? createSupabaseStore() : createMemoryStore();
  }
  return store;
}
