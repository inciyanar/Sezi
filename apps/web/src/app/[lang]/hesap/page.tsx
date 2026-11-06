"use client";

import { profileFor } from "@sezi/shared";
import { ChevronRightIcon, KeyRoundIcon, LogOutIcon, PencilIcon, Trash2Icon, UserCheckIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AccountHeader, AccountPage as AccountShell, accountCard } from "@/components/account/account-layout";
import { Avatar } from "@/components/account/avatar";
import { AccountNote, FormError } from "@/components/account/form-error";
import { CommunityTiles, SocialOverview } from "@/components/account/social-overview";
import { ProfileDialog } from "@/components/profile-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorKey, signOut, useAccount } from "@/lib/account";
import { href } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { useIdentity } from "@/lib/identity";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

/** Ayar satırının içeriği: ikon dairesi, başlık, isteğe bağlı alt satır ve sağda ok. */
function RowBody({ icon: Icon, title, detail, danger }: { icon: LucideIcon; title: string; detail?: string; danger?: boolean }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full contrast:outline-2 contrast:outline-border",
          danger ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5 text-left">
        <span className={cn("font-bold text-[15px]", danger && "text-destructive")}>{title}</span>
        {detail ? <span className="truncate text-sm text-muted-foreground">{detail}</span> : null}
      </span>
      <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </>
  );
}

const rowClass =
  "group flex min-h-16 w-full items-center gap-4 rounded-[18px] px-3 py-2 outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring";

function SettingsList({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section aria-labelledby="settings-heading" className="grid gap-3">
      <h2 id="settings-heading" className="font-heading font-normal tracking-[-0.02em] text-2xl">
        {title}
      </h2>
      <div className={cn(accountCard, "grid gap-1 p-2")}>{children}</div>
    </section>
  );
}

/**
 * Hesap ana sayfası. Girişsizken: pasaport çağrısı, kayıt/giriş, erişilebilirlik profili ve gizlilik notu.
 * Girişliyken: avatar + "Merhaba" başlığı, sağda pasaport ve damgalar, solda topluluk, ayarlar (profil, erişilebilirlik,
 * şifre, hesap silme) ve çıkış.
 */
export default function AccountPage() {
  const { t, lang } = useT();
  const { ready, user } = useAccount();
  const { identity, avatar } = useIdentity();
  const savedProfile = useProfile();
  const profile = savedProfile ?? profileFor("walker", lang);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [outError, setOutError] = useState<string | null>(null);

  const profileSummary = `${t(`profile.vision.${profile.vision}`)} · ${t(`profile.mobility.${profile.mobility}`)} · ${t(`profile.hearing.${profile.hearing}`)}`;
  const profileRow = (
    <button type="button" className={rowClass} onClick={() => setProfileOpen(true)}>
      <RowBody icon={UserCheckIcon} title={t("profile.title")} detail={profileSummary} />
    </button>
  );

  if (!ready) {
    return (
      <AccountShell width="wide">
        <AccountHeader lang={lang} eyebrow={t("account.title")} title={t("account.settingsTitle")} />
        <div role="status" aria-label={t("account.loading")} className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <Skeleton className="h-72 w-full rounded-[24px]" />
          <Skeleton className="h-72 w-full rounded-[24px]" />
        </div>
      </AccountShell>
    );
  }

  if (!user) {
    return (
      <AccountShell>
        <AccountHeader lang={lang} eyebrow={t("auth.eyebrow")} title={t("auth.signUpTitle")} lead={t("auth.signUpLead")} />
        <div className="grid gap-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg" arrow>
              <Link href={href(lang, "/hesap/kayit")}>{t("account.signUp")}</Link>
            </Button>
            <Button asChild size="lg" variant="line">
              <Link href={href(lang, "/hesap/giris")}>{t("account.signIn")}</Link>
            </Button>
          </div>
          <SettingsList title={t("account.settingsTitle")}>{profileRow}</SettingsList>
          <AccountNote text={t("account.privacy")} />
        </div>
        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </AccountShell>
    );
  }

  const handleSignOut = async () => {
    setLeaving(true);
    setOutError(null);
    try {
      await signOut();
      toast.success(t("account.signedOut"));
    } catch (e) {
      setOutError(t(errorKey(e) === "account.err.network" ? "account.signOutOffline" : "account.err.generic"));
    } finally {
      setLeaving(false);
    }
  };

  const name = identity?.display_name || user.email || "";
  const handle = identity?.username ? `@${identity.username}` : identity?.display_name ? user.email : undefined;

  return (
    <AccountShell width="wide">
      <div className="mb-10 flex items-center gap-5 sm:gap-6">
        <Avatar identity={identity} src={avatar} size={72} />
        <AccountHeader lang={lang} eyebrow={t("account.title")} title={t("account.hello", { name })} lead={handle} className="mb-0 min-w-0 sm:mb-0 [&_h1]:break-words" />
      </div>
      {/* Dar ekranda sıra: pasaport/damgalar, topluluk, ayarlar; geniş ekranda pasaport sağ sütunda. */}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-12">
        <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <SocialOverview uid={user.id} />
        </div>
        <div className="lg:col-start-1">
          <CommunityTiles uid={user.id} />
        </div>
        <div className="grid gap-4 lg:col-start-1">
          <SettingsList title={t("account.settingsTitle")}>
            <Link href={href(lang, "/hesap/duzenle")} className={rowClass}>
              <RowBody icon={PencilIcon} title={t("account.editProfile")} detail={handle ?? name} />
            </Link>
            {profileRow}
            <Link href={href(lang, "/hesap/sifre?mod=degistir")} className={rowClass}>
              <RowBody icon={KeyRoundIcon} title={t("account.changePassword")} />
            </Link>
            <Link href={href(lang, "/hesap/sil")} className={cn(rowClass, "hover:bg-destructive/5")}>
              <RowBody icon={Trash2Icon} title={t("account.delete")} danger />
            </Link>
          </SettingsList>
          <Button variant="line" size="lg" onClick={() => void handleSignOut()} disabled={leaving}>
            <LogOutIcon aria-hidden />
            {leaving ? t("account.signingOut") : t("account.signOut")}
          </Button>
          <FormError text={outError} />
        </div>
      </div>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </AccountShell>
  );
}
