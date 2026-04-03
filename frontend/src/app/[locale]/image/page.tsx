"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter as useNextRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImagePlus, Wand2 } from "lucide-react";

import { Header } from "@/components/Header";
import { ImageCreateWorkspace } from "@/components/ImageCreate";
import { ImageEditWorkspace } from "@/components/ImageEdit";

type Tab = "create" | "edit";

export default function ImagePage() {
  const t = useTranslations("ImagePage");
  const searchParams = useSearchParams();
  const nextRouter = useNextRouter();
  const pathname = usePathname();
  const initialImg = searchParams.get("img") ?? undefined;
  const initialTab = (searchParams.get("tab") as Tab) ?? (initialImg ? "edit" : "create");
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>(initialImg);

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "create") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    nextRouter.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, nextRouter, pathname]);

  const handleSwitchToEdit = useCallback((imageUrl?: string) => {
    if (imageUrl) setEditImageUrl(imageUrl);
    switchTab("edit");
  }, [switchTab]);

  const TABS: { id: Tab; labelKey: string; icon: typeof ImagePlus }[] = [
    { id: "create", labelKey: "tabCreate", icon: ImagePlus },
    { id: "edit", labelKey: "tabEdit", icon: Wand2 },
  ];

  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const btn = track.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeTab]);

  return (
    <div>
      <Header />
      {/* 탭 스위치 — 고정 */}
      <div className="fixed inset-x-0 top-16 z-20 flex justify-center py-3">
        <div ref={trackRef} className="relative inline-flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
          {/* 슬라이딩 인디케이터 */}
          <div
            className="absolute top-1 bottom-1 rounded-full bg-white/80 shadow-sm transition-all duration-200 ease-out dark:bg-neutral-700/50"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`relative z-10 flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-[14px] font-[500] transition-colors duration-200 ${
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
      <main className="pt-[120px]">
        <div
          key={activeTab}
          className="animate-[fade-in_200ms_ease-out]"
        >
          {activeTab === "create" ? (
            <ImageCreateWorkspace onSwitchToEdit={handleSwitchToEdit} />
          ) : (
            <ImageEditWorkspace initialImageUrl={editImageUrl} />
          )}
        </div>
      </main>
    </div>
  );
}
