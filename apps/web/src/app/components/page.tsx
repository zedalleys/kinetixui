import type { Metadata } from "next";
import { ComponentGallery } from "@/components/component-gallery";

export const metadata: Metadata = {
  title: "Components",
  description: "Every component in the KinetixUI registry.",
};

export default function ComponentsPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Registry</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Components</h1>
      <ComponentGallery />
    </div>
  );
}
