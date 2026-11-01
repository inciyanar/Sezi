"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n-client";

export type WorkTabPanel = { value: "about" | "visit" | "record"; label: string; content: ReactNode };

/**
 * Eser sayfasının üç sekmesi (Hakkında, Ziyaret, Künye). Bütün sekmelerin içeriği sayfada kalır (arama motoru ve
 * "sayfada bul" için); seçili olmayanlar yalnız gizlenir. Sekme değişimi anında olur: sık basılır, kayma gecikme gibi hissettirir.
 */
export function WorkTabs({ panels }: { panels: WorkTabPanel[] }) {
  const { t } = useT();
  const first = panels[0];
  if (!first) return null;
  return (
    <Tabs defaultValue={first.value} className="gap-8">
      <TabsList
        aria-label={t("works.detail.tabs")}
        className="w-full rounded-xl p-1 group-data-horizontal/tabs:h-auto sm:w-fit contrast:outline-2 contrast:outline-border"
      >
        {panels.map((p) => (
          <TabsTrigger key={p.value} value={p.value} className="min-h-11 rounded-lg px-5 text-base font-semibold text-muted-foreground data-active:text-foreground">
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {panels.map((p) => (
        <TabsContent key={p.value} value={p.value} forceMount className="text-base data-[state=inactive]:hidden">
          {p.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
