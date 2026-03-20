import { Table } from "@mantine/core";
import type { Photo } from "../../../lib/types";
import { PhotoListRow } from "../../molecules/PhotoListRow";

type PhotoListProps = {
  folderId: string;
  photos: Photo[];
};

export const PhotoList = ({ folderId, photos }: PhotoListProps) => (
  <Table highlightOnHover>
    <Table.Thead>
      <Table.Tr>
        <Table.Th w={50} />
        <Table.Th>ファイル名</Table.Th>
        <Table.Th>撮影日時</Table.Th>
        <Table.Th>サイズ</Table.Th>
        <Table.Th>解像度</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {photos.map((photo) => (
        <PhotoListRow key={photo.id} folderId={folderId} photo={photo} />
      ))}
    </Table.Tbody>
  </Table>
);
