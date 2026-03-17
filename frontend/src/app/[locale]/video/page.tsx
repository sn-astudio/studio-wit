import { Header } from "@/components/Header";
import { useTranslations } from "next-intl";

export default function VideoPage() {
  const t = useTranslations("VideoPage");

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </main>
    </div>
  );
}
