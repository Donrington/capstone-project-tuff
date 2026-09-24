import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Showcase } from "./Showcase";

export const metadata: Metadata = { title: "UI showcase" };

/** Dev-only: every #18 component in every state, for eyeballing them. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div>
      <PageHeader
        kicker="Dev"
        title="UI showcase"
        subtitle="Every shared component in every state. This page 404s in production."
      />
      <Showcase />
    </div>
  );
}
