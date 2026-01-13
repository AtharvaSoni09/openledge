
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Daily Law - Legal Analysis and Policy News",
  description: "Non-partisan legislative analysis and policy research. Understand what's happening in Congress with clear, data-driven insights.",
  openGraph: {
    title: "The Daily Law - Legal Analysis and Policy News",
    description: "Non-partisan legislative analysis and policy research. Understand what's happening in Congress with clear, data-driven insights.",
    type: "website",
    url: "https://thedailylaw.org/legislation-summary",
  },
  alternates: {
    canonical: "https://thedailylaw.org/legislation-summary",
  },
};

export default function Home() {
  redirect("/legislation-summary");
}
