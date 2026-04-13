import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["th", "en", "zh"] as const;
const DEFAULT_LOCALE = "th";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;

  const locale = hasLocale(SUPPORTED_LOCALES, cookieLocale)
    ? cookieLocale
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});