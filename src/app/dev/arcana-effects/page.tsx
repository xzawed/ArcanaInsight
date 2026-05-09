import { notFound } from "next/navigation";
import { ArcanaEffectsPreview } from "./preview-client";

export default function ArcanaEffectsPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <ArcanaEffectsPreview />;
}
