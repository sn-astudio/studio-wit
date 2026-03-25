"use client";

import { useSearchParams } from "next/navigation";

import { Header } from "@/components/Header";
import { ImageEditWorkspace } from "@/components/ImageEdit";

export default function ImageEditPage() {
  const searchParams = useSearchParams();
  const initialImageUrl = searchParams.get("img") ?? undefined;

  return (
    <div className="h-screen overflow-hidden">
      <Header />
      <main className="pt-16">
        <ImageEditWorkspace initialImageUrl={initialImageUrl} />
      </main>
    </div>
  );
}
