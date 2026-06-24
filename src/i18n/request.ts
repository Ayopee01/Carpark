import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

// Config สำหรับการโหลดข้อความแปลภาษาในฝั่งเซิร์ฟเวอร์ โดยจะตรวจสอบ locale จากคุกกี้และโหลดไฟล์ข้อความที่ตรงกับ locale นั้น ๆ
const SUPPORTED_LOCALES = ["th", "en", "zh"] as const;
const DEFAULT_LOCALE = "th";

// Function เรียกข้อมูลการแปลภาษาที่จะถูกใช้ในแอปพลิเคชัน โดยจะตรวจสอบ locale จากคุกกี้และโหลดไฟล์ข้อความที่ตรงกับ locale นั้น ๆ
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;

  // ตรวจสอบว่า locale ที่ได้จากคุกกี้เป็นหนึ่งใน SUPPORTED_LOCALES หรือไม่ ถ้าไม่ใช่จะใช้ DEFAULT_LOCALE แทน
  const locale = hasLocale(SUPPORTED_LOCALES, cookieLocale)
    ? cookieLocale
    : DEFAULT_LOCALE;

  // โหลดไฟล์ข้อความแปลภาษาที่ตรงกับ locale ที่ได้มา และส่งกลับเป็นอ็อบเจ็กต์ที่มี locale และ messages
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});