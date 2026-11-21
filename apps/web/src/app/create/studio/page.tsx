import type { Metadata } from "next";
import Link from "next/link";
import { CreateStudio } from "@/components/create-studio/create-studio";
import "./studio.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create Studio · local development", robots: { index: false, follow: false } };
export default function StudioPage() {
  if (process.env.NODE_ENV !== "development" || process.env.KINETIX_CREATE_DEV !== "1") return <section className="mx-auto max-w-2xl px-6 py-16"><h1 className="text-3xl font-semibold">Create Studio is in development.</h1><p className="mt-4">The local editor requires an explicitly enabled development server. Production accounts and billing are not configured.</p><Link className="mt-6 inline-block underline" href="/create">Open the theme creator</Link></section>;
  return <CreateStudio />;
}
