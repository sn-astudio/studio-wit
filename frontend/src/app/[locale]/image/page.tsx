"use client";

import { useEffect } from "react";

import { Header } from "@/components/Header";
import { ImageCreateWorkspace } from "@/components/ImageCreate";

export default function ImagePage() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      <Header />
      <main className="pt-16">
        <ImageCreateWorkspace />
      </main>
    </div>
  );
}
