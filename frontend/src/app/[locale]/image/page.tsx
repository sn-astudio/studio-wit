import { Header } from "@/components/Header";
import { ImageCreateWorkspace } from "@/components/ImageCreate";

export default function ImagePage() {
  return (
    <div className="h-screen overflow-hidden">
      <Header />
      <main className="pt-16">
        <ImageCreateWorkspace />
      </main>
    </div>
  );
}
