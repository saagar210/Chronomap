import { useState, useCallback, useEffect } from "react";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  eventId: string | null;
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    eventId: null,
  });

  const show = useCallback((x: number, y: number, eventId: string | null) => {
    setMenu({ visible: true, x, y, eventId });
  }, []);

  const hide = useCallback(() => {
    setMenu((m) => ({ ...m, visible: false }));
  }, []);

  useEffect(() => {
    if (!menu.visible) return;
    const handler = () => hide();
    window.addEventListener("click", handler);
    window.addEventListener("contextmenu", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("contextmenu", handler);
    };
  }, [menu.visible, hide]);

  return { menu, show, hide };
}
