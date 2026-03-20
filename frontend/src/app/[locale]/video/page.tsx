import { Header } from "@/components/Header";
import { VideoCreateWorkspace } from "@/components/VideoCreate";

export default function VideoPage() {
  return (
    <div className="h-screen overflow-hidden">
      <Header />
      <main className="pt-16">
        <VideoCreateWorkspace />
      </main>
    </div>
  );
}
