import { notFound } from "next/navigation";
import { CharacterImageQualityPreview } from "./preview-client";

export default function ArcanaImageQualityPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <CharacterImageQualityPreview />;
}
