import type { Metadata } from "next";
import { ComponentGallery } from "@/components/component-gallery";

export const metadata: Metadata = {
  title: "Components",
  description: "Every component in the KinetixUI registry.",
};

export default function ComponentsPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Components</h1>
      <ComponentGallery />
    </div>
  );
}
