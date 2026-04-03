import { Header } from "@/components/Header";
import { GalleryDetail } from "@/components/GalleryDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GalleryDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <GalleryDetail id={id} />
      </main>
    </div>
  );
}
