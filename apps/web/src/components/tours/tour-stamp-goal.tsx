"use client";

import { TOUR_BADGES } from "@sezi/shared";

import { BadgeArt } from "@/components/account/badge-art";
import { usePassportData } from "@/components/account/passport-content";
import { achievementTarget, BADGE_NAME } from "@/components/account/social-visuals";
import { Glass } from "@/components/ui/glass";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAccount } from "@/lib/account";
import { useT } from "@/lib/i18n-client";

/**
 * Damgalı turun hedef kutusu: damga çizimi, "Bitirirsen damga senin" ve sezilen durak ilerlemesi. Yalnız turun
 * bir damgası varsa ve kullanıcı giriş yapmışsa çizilir; ilerleme ortak başarım hesabından gelir (uydurma sayı yok).
 */
export function TourStampGoal({ tourSlug }: { tourSlug: string }) {
  const { t } = useT();
  const { user } = useAccount();
  const badge = TOUR_BADGES[tourSlug];
  const { data } = usePassportData(badge ? user?.id : undefined);
  if (!badge || !user || !data) return null;
  const achievement = data.list.find((a) => a.kind === "tour" && a.subject?.slug === tourSlug);
  if (!achievement) return null;
  const earned = achievement.level > 0;
  const name = t(BADGE_NAME[badge]);
  return (
    <Glass tone="light" className="flex items-center gap-4 rounded-[22px] p-4">
      <BadgeArt id={badge} size={56} locked={!earned} />
      <div className="grid min-w-0 flex-1 gap-2">
        <p className="font-bold">{earned ? t("tours.stampEarned", { name }) : t("tours.stampGoal", { name })}</p>
        {earned ? null : <ProgressBar value={achievement.current} max={achievementTarget(achievement)} label={name} />}
      </div>
    </Glass>
  );
}
