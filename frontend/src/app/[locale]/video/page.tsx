"use client";

import { useEffect } from "react";

import { Header } from "@/components/Header";
import { VideoCreateWorkspace } from "@/components/VideoCreate";

export default function VideoPage() {
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
        <VideoCreateWorkspace />
      </main>
    </div>
  );
}
