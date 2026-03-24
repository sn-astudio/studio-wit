import { Header } from "@/components/Header";
import { ImageEditWorkspace } from "@/components/ImageEdit";

export default function ImageEditPage() {
  return (
    <div className="h-screen overflow-hidden">
      <Header />
      <main className="pt-16">
        <ImageEditWorkspace />
      </main>
    </div>
  );
}
