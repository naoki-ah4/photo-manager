import { Paper, UnstyledButton } from "@mantine/core";
import { IconCopy, IconFolderOpen } from "@tabler/icons-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./index.module.css";

type PhotoContextMenuProps = {
  opened: boolean;
  x: number;
  y: number;
  filePath: string;
  onClose: () => void;
};

export const PhotoContextMenu = ({
  opened,
  x,
  y,
  filePath,
  onClose,
}: PhotoContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!opened) return;
    const el = menuRef.current;
    if (!el) {
      setAdjusted({ x, y });
      return;
    }
    const rect = el.getBoundingClientRect();
    setAdjusted({
      x: x + rect.width > window.innerWidth ? x - rect.width : x,
      y: y + rect.height > window.innerHeight ? y - rect.height : y,
    });
  }, [opened, x, y]);

  if (!opened) return null;

  const handleReveal = async () => {
    onClose();
    await revealItemInDir(filePath);
  };

  const handleCopyPath = async () => {
    onClose();
    await navigator.clipboard.writeText(filePath);
  };

  return createPortal(
    <Paper
      ref={menuRef}
      shadow="md"
      className={styles.menu}
      style={{ top: adjusted.y, left: adjusted.x }}
      data-context-menu
    >
      <UnstyledButton className={styles.menuItem} onClick={handleReveal}>
        <IconFolderOpen size={16} />
        エクスプローラーで表示
      </UnstyledButton>
      <UnstyledButton className={styles.menuItem} onClick={handleCopyPath}>
        <IconCopy size={16} />
        ファイルパスをコピー
      </UnstyledButton>
    </Paper>,
    document.body,
  );
};
