import { create } from "zustand";
import type { Connection } from "../lib/types";
import type { CreateConnectionInput, UpdateConnectionInput } from "../lib/commands";
import * as cmd from "../lib/commands";

interface ConnectionStore {
  connections: Connection[];
  loading: boolean;
  error: string | null;

  loadConnections: (timelineId: string) => Promise<void>;
  createConnection: (input: CreateConnectionInput) => Promise<Connection>;
  updateConnection: (input: UpdateConnectionInput) => Promise<Connection>;
  deleteConnection: (id: string) => Promise<void>;
  clearConnections: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connections: [],
  loading: false,
  error: null,

  loadConnections: async (timelineId) => {
    set({ loading: true, error: null });
    try {
      const connections = await cmd.listConnections(timelineId);
      set({ connections, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createConnection: async (input) => {
    set({ error: null });
    try {
      const connection = await cmd.createConnection(input);
      set((s) => ({ connections: [...s.connections, connection] }));
      return connection;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  updateConnection: async (input) => {
    set({ error: null });
    try {
      const updated = await cmd.updateConnection(input);
      set((s) => ({
        connections: s.connections.map((c) =>
          c.id === updated.id ? updated : c
        ),
      }));
      return updated;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteConnection: async (id) => {
    set({ error: null });
    try {
      await cmd.deleteConnection(id);
      set((s) => ({
        connections: s.connections.filter((c) => c.id !== id),
      }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  clearConnections: () => set({ connections: [], error: null }),
}));
