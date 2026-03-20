import { Table } from "@mantine/core";
import type { Photo } from "../../../lib/types";
import { PhotoListRow } from "../../molecules/PhotoListRow";

type PhotoListProps = {
  photos: Photo[];
};

export const PhotoList = ({ photos }: PhotoListProps) => (
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
        <PhotoListRow key={photo.id} photo={photo} />
      ))}
    </Table.Tbody>
  </Table>
);
