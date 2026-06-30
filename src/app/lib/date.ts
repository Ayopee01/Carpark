// Function สำหรับแปลงเวลาออกจากลานจอดให้แสดงผลตามภาษาที่ผู้ใช้เลือก
export function formatExitTime(value: string | null, locale: string) {
    // ถ้าไม่มีค่าเวลา หรือแปลงเป็นวันที่ไม่ได้ ให้คืนค่าว่างเพื่อไม่ต้องแสดงผลบน UI
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    // แสดงวันที่และเวลาโดยยึด timezone TH
    return new Intl.DateTimeFormat(
        locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Bangkok",
        }
    ).format(date);
}
