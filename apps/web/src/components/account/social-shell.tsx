"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AccountHeader, AccountPage } from "@/components/account/account-layout";
import { FormError } from "@/components/account/form-error";
import { Skeleton } from "@/components/ui/skeleton";
import { errorKey, useAccount } from "@/lib/account";
import { href, type MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";

export function useSocialAccount() {
  const account = useAccount();
  const router = useRouter();
  const { lang } = useT();
  useEffect(() => {
    if (account.ready && !account.user)
      router.replace(href(lang, "/hesap/giris"));
  }, [account.ready, account.user, router, lang]);
  return account;
}

export function SocialShell({
  title,
  children,
  error,
  loading,
}: {
  title: MessageKey;
  children: ReactNode;
  error?: unknown;
  loading?: boolean;
}) {
  const { t, lang } = useT();
  return (
    <AccountPage width="medium">
      <AccountHeader lang={lang} eyebrow={t("account.title")} title={t(title)} />
      <div className="grid gap-6">
        <FormError text={error ? t(errorKey(error)) : null} />
        {loading ? (
          <div role="status" aria-label={t("account.loading")}>
            <Skeleton className="h-48 w-full rounded-[24px]" />
          </div>
        ) : (
          children
        )}
      </div>
    </AccountPage>
  );
}
