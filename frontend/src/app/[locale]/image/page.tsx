"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImagePlus, Wand2 } from "lucide-react";

import { Header } from "@/components/Header";
import { ImageCreateWorkspace } from "@/components/ImageCreate";
import { ImageEditWorkspace } from "@/components/ImageEdit";

type Tab = "create" | "edit";

export default function ImagePage() {
  const t = useTranslations("ImagePage");
  const searchParams = useSearchParams();
  const initialImg = searchParams.get("img") ?? undefined;
  const [activeTab, setActiveTab] = useState<Tab>(initialImg ? "edit" : "create");
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>(initialImg);

  const handleSwitchToEdit = useCallback((imageUrl?: string) => {
    if (imageUrl) setEditImageUrl(imageUrl);
    setActiveTab("edit");
  }, []);

  const TABS: { id: Tab; labelKey: string; icon: typeof ImagePlus }[] = [
    { id: "create", labelKey: "tabCreate", icon: ImagePlus },
    { id: "edit", labelKey: "tabEdit", icon: Wand2 },
  ];

  return (
    <div className="h-screen overflow-hidden">
      <Header />
      <main className="pt-16">
        {/* 탭 스위치 */}
        <div className="flex justify-center pt-4">
          <div className="relative inline-flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/80">
            {/* 슬라이딩 인디케이터 */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-200 ease-out dark:bg-neutral-700 ${
                activeTab === "edit" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
              }`}
              style={{ left: 4 }}
            />
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-10 flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2 text-[14px] font-[500] transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={isActive ? 2 : 1.5} />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === "create" ? (
          <ImageCreateWorkspace onSwitchToEdit={handleSwitchToEdit} />
        ) : (
          <ImageEditWorkspace initialImageUrl={editImageUrl} />
        )}
      </main>
    </div>
  );
}
