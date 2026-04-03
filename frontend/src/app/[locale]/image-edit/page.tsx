"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { Header } from "@/components/Header";
import { ImageEditWorkspace } from "@/components/ImageEdit";

export default function ImageEditPage() {
  const searchParams = useSearchParams();
  const initialImageUrl = searchParams.get("img") ?? undefined;

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      <Header />
      <main className="pt-[72px]">
        <ImageEditWorkspace initialImageUrl={initialImageUrl} />
      </main>
    </div>
  );
}
