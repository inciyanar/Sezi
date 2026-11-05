"use client";

import { PassportContent, usePassportData } from "@/components/account/passport-content";
import { FormError } from "@/components/account/form-error";
import { useAccount, errorKey } from "@/lib/account";
import { useT } from "@/lib/i18n-client";

export default function PassportPage() {
  const { ready, user } = useAccount();
  const { t } = useT();
  const result = usePassportData(user?.id);
  if (!ready || (user && result.loading)) return <div role="status" className="p-12">{t("account.loading")}</div>;
  if (user && result.error) return <FormError text={t(errorKey(result.error))} />;
  return <PassportContent data={user ? result.data ?? null : null} createdAt={user?.created_at} />;
}
