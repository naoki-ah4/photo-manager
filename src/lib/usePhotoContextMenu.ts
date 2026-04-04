import { useCallback, useEffect, useState } from "react";

type ContextMenuState = {
  opened: boolean;
  x: number;
  y: number;
};

const INITIAL_STATE: ContextMenuState = { opened: false, x: 0, y: 0 };

export const usePhotoContextMenu = () => {
  const [state, setState] = useState<ContextMenuState>(INITIAL_STATE);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (state.opened) {
        setState(INITIAL_STATE);
        return;
      }
      e.preventDefault();
      setState({ opened: true, x: e.clientX, y: e.clientY });
    },
    [state.opened],
  );

  const close = useCallback(() => setState(INITIAL_STATE), []);

  useEffect(() => {
    if (!state.opened) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-context-menu]")) {
        e.stopPropagation();
        e.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick, true);
    };
  }, [state.opened, close]);

  return { state, handleContextMenu, close };
};
