import { SimpleGrid } from "@mantine/core";
import type { Photo } from "../../../lib/types";
import { PhotoGridItem } from "../../molecules/PhotoGridItem";

type PhotoGridProps = {
  folderId: string;
  photos: Photo[];
};

export const PhotoGrid = ({ folderId, photos }: PhotoGridProps) => (
  <SimpleGrid cols={{ base: 3, sm: 4, md: 6, lg: 8 }} spacing="xs">
    {photos.map((photo) => (
      <PhotoGridItem key={photo.id} folderId={folderId} photo={photo} />
    ))}
  </SimpleGrid>
);
