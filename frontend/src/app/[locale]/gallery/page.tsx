import { Header } from "@/components/Header";
import { Gallery } from "@/components/Gallery";

export default function GalleryPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <Gallery variant="page" />
      </main>
    </div>
  );
}
