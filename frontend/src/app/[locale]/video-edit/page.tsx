"use client";

import { Header } from "@/components/Header";
import { VideoEditWorkspace } from "@/components/VideoEdit";

export default function VideoEditPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <VideoEditWorkspace />
      </main>
    </>
  );
}
