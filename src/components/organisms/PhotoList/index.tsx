import { Table } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { Photo } from "../../../lib/types";
import { PhotoListRow } from "../../molecules/PhotoListRow";
import styles from "./index.module.css";

type PhotoListProps = {
  folderId: string;
  photos: Photo[];
};

const ROW_HEIGHT = 52;

export const PhotoList = ({ folderId, photos }: PhotoListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: photos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div ref={scrollRef} className={styles.scrollContainer}>
      <Table highlightOnHover>
        <Table.Thead className={styles.stickyHeader}>
          <Table.Tr>
            <Table.Th w={50} />
            <Table.Th>ファイル名</Table.Th>
            <Table.Th>撮影日時</Table.Th>
            <Table.Th>サイズ</Table.Th>
            <Table.Th>解像度</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paddingTop > 0 && (
            <tr>
              <td
                colSpan={5}
                style={{ height: paddingTop, padding: 0, border: "none" }}
              />
            </tr>
          )}
          {virtualItems.map((virtualRow) => (
            <PhotoListRow
              key={photos[virtualRow.index].id}
              folderId={folderId}
              photo={photos[virtualRow.index]}
            />
          ))}
          {paddingBottom > 0 && (
            <tr>
              <td
                colSpan={5}
                style={{ height: paddingBottom, padding: 0, border: "none" }}
              />
            </tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
};
