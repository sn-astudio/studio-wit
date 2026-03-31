import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Gallery } from "@/components/Gallery";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="relative z-0 pt-16">
        <Hero />
        <Features />
        <Gallery />
        <Footer />
      </main>
    </>
  );
}
