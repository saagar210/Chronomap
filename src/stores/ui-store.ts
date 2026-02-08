import { create } from "zustand";
import { SIDEBAR_DEFAULT_WIDTH, DETAIL_PANEL_DEFAULT_WIDTH } from "../lib/constants";

interface UiStore {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  detailPanelWidth: number;
  detailPanelCollapsed: boolean;
  activeModal: string | null;

  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setDetailPanelWidth: (width: number) => void;
  toggleDetailPanel: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  sidebarCollapsed: false,
  detailPanelWidth: DETAIL_PANEL_DEFAULT_WIDTH,
  detailPanelCollapsed: true,
  activeModal: null,

  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setDetailPanelWidth: (width) => set({ detailPanelWidth: width }),
  toggleDetailPanel: () =>
    set((s) => ({ detailPanelCollapsed: !s.detailPanelCollapsed })),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
