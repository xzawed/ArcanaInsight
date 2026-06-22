import { notFound } from "next/navigation";
import { CharacterImageQualityPreview } from "../arcana-image-quality/preview-client";

export default function CharacterImageQualityPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <CharacterImageQualityPreview />;
}
