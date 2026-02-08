import { create } from "zustand";
import type { Connection } from "../lib/types";
import type { CreateConnectionInput, UpdateConnectionInput } from "../lib/commands";
import * as cmd from "../lib/commands";
import { useHistoryStore } from "./history-store";
import { useToastStore } from "./toast-store";

interface ConnectionStore {
  connections: Connection[];
  selectedConnectionId: string | null;
  loading: boolean;
  error: string | null;

  loadConnections: (timelineId: string) => Promise<void>;
  createConnection: (input: CreateConnectionInput) => Promise<Connection>;
  updateConnection: (input: UpdateConnectionInput) => Promise<Connection>;
  deleteConnection: (id: string) => Promise<void>;
  selectConnection: (id: string | null) => void;
  clearConnections: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: [],
  selectedConnectionId: null,
  loading: false,
  error: null,

  loadConnections: async (timelineId) => {
    set({ loading: true, error: null });
    try {
      const connections = await cmd.listConnections(timelineId);
      set({ connections, loading: false });
    } catch (e) {
      const msg = String(e);
      set({ error: msg, loading: false });
      useToastStore.getState().addToast({ type: "error", title: "Failed to load connections", description: msg });
    }
  },

  createConnection: async (input) => {
    set({ error: null });
    try {
      const connection = await cmd.createConnection(input);
      set((s) => ({ connections: [...s.connections, connection] }));
      useHistoryStore.getState().push({ type: "connection:create", before: null, after: connection });
      useToastStore.getState().addToast({ type: "success", title: "Connection created" });
      return connection;
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to create connection", description: msg });
      throw e;
    }
  },

  updateConnection: async (input) => {
    set({ error: null });
    const before = get().connections.find((c) => c.id === input.id);
    try {
      const updated = await cmd.updateConnection(input);
      set((s) => ({
        connections: s.connections.map((c) =>
          c.id === updated.id ? updated : c
        ),
      }));
      if (before) {
        useHistoryStore.getState().push({ type: "connection:update", before, after: updated });
      }
      return updated;
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to update connection", description: msg });
      throw e;
    }
  },

  deleteConnection: async (id) => {
    set({ error: null });
    const before = get().connections.find((c) => c.id === id);
    try {
      await cmd.deleteConnection(id);
      set((s) => ({
        connections: s.connections.filter((c) => c.id !== id),
        selectedConnectionId: s.selectedConnectionId === id ? null : s.selectedConnectionId,
      }));
      if (before) {
        useHistoryStore.getState().push({ type: "connection:delete", before, after: null });
        useToastStore.getState().addToast({ type: "success", title: "Connection deleted" });
      }
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to delete connection", description: msg });
      throw e;
    }
  },

  selectConnection: (id) => set({ selectedConnectionId: id }),
  clearConnections: () => set({ connections: [], selectedConnectionId: null, error: null }),
}));
