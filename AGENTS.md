# AGENTS.md

เอกสารนี้จัดทำเพื่อใช้เป็น Prompt / Specification ให้ AI หรือทีม Frontend วิเคราะห์และปรับปรุง **Frontend สำหรับตู้ Kiosk และ Barrier Gate** ให้เชื่อมต่อกับ **Backend API ล่าสุดของ Smart Carpark** ได้ถูกต้องตาม Response และการทำงานจริงของ Backend
 
> ฝั่ง Kiosk / Barrier Gate ไม่ใช่ Admin Frontend และไม่ควรใช้ Admin Bearer token  
> การยืนยันตัวตนของอุปกรณ์ใช้ `deviceId` + `deviceToken`

---

## 1. Project Concept

Frontend นี้เป็น Project เดียวกันสำหรับอุปกรณ์ 2 ประเภท:

1. **Kiosk**
   - ใช้หน้าจอสำหรับผู้ใช้งานค้นหาทะเบียนรถ
   - แสดงยอดค่าจอด
   - แสดง QR / ช่องทางชำระเงิน
   - ส่ง payment ไปยัง Backend
   - แสดงผลการชำระเงิน
   - ใช้ theme/logo/config จาก Backend

2. **Barrier Gate**
   - ใช้สำหรับอุปกรณ์ไม้กั้น
   - รับ plateNo หรือ transactionId จากระบบกล้อง/LPR หรือ input ภายนอก
   - ตรวจสอบ transaction
   - check-in/heartbeat ไปยัง Backend
   - รับ event/config/theme update
   - สั่งเปิดไม้กั้นตามเงื่อนไขที่ระบบกำหนด
   - กรณีใช้ payment endpoint ของ gate ให้ระวังว่าการจ่ายผ่าน channel `gate` จะทำให้ transaction เป็น completed และตั้งเวลาออกทันที

---

## 2. Backend Base URL

ใช้ environment variable:

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
```

ตัวอย่าง:

```env
NEXT_PUBLIC_API_BASE_URL=https://carpark-uat.biza.me
```

---

## 3. Important Backend Routes

### Public Device Config

```http
GET /api/v1/devices/config
```

ใช้โหลด theme/config พื้นฐานก่อน activate ได้

---

### Client / Kiosk / Barrier Routes

Base path:

```txt
/api/v1/client
```

Endpoints:

```http
POST /api/v1/client/activate
POST /api/v1/client/check-in
GET  /api/v1/client/transaction?plateNo={plateNo}&deviceId={deviceId}
GET  /api/v1/client/transaction/{id}?deviceId={deviceId}
POST /api/v1/client/{plateNo}/payment
POST /api/v1/client/payment
GET  /api/v1/client/events?deviceId={deviceId}
```

---

## 4. Device Authentication

หลัง activate สำเร็จ Backend จะคืน:

```ts
deviceId
deviceToken
deviceType
deviceName
location
status
```

ให้ Frontend เก็บไว้ใน local storage หรือ secure storage ของ device

### Headers ที่ควรส่งกับ Protected Device APIs

Backend รองรับ token ผ่าน header แบบใดแบบหนึ่ง:

```http
x-device-id: <deviceId>
x-device-token: <deviceToken>
```

หรือ

```http
x-device-id: <deviceId>
Authorization: Device <deviceToken>
```

แนะนำใช้แบบนี้:

```http
x-device-id: <deviceId>
x-device-token: <deviceToken>
```

### APIs ที่ต้องใช้ device credential

```http
POST /api/v1/client/check-in
GET  /api/v1/client/events?deviceId={deviceId}
```

### APIs ที่ควรส่ง deviceId เพื่อให้ Backend รู้แหล่งที่มา

```http
GET  /api/v1/client/transaction?plateNo={plateNo}&deviceId={deviceId}
GET  /api/v1/client/transaction/{id}?deviceId={deviceId}
POST /api/v1/client/payment
POST /api/v1/client/{plateNo}/payment
```

---

## 5. Device Lifecycle

### 5.1 First Start

1. Load base config:
   ```http
   GET /api/v1/devices/config
   ```
2. ตรวจว่ามี device credential ใน storage หรือไม่
3. ถ้ายังไม่มี ให้แสดงหน้า Activate Device
4. ถ้ามีแล้ว ให้ call check-in
5. ถ้า check-in สำเร็จ ให้เข้า mode ตาม `deviceType`
6. ถ้า check-in ล้มเหลวเพราะ token invalid ให้กลับไปหน้า activate

---

### 5.2 Activation Flow

Endpoint:

```http
POST /api/v1/client/activate
```

Request:

```ts
export type DeviceActivateRequest = {
  code: string;
};
```

Response:

```ts
export type DeviceActivateResponse = {
  success: boolean;
  message: string;
  deviceToken: string;
  deviceId: string;
  deviceType: "kiosk" | "barrier_gate";
  deviceName: string;
  location: string | null;
  status: string;
};
```

Frontend behavior:

- User กรอก activation code ที่ Admin สร้างไว้
- ส่ง `{ code }`
- ถ้าสำเร็จ ให้บันทึก:
  - `deviceId`
  - `deviceToken`
  - `deviceType`
  - `deviceName`
  - `location`
  - `status`
- redirect ไปหน้า mode ตาม `deviceType`
- ถ้าล้มเหลวให้แสดง error เช่น “Invalid or expired code”

---

### 5.3 Check-in / Heartbeat

Endpoint:

```http
POST /api/v1/client/check-in
```

Headers:

```http
x-device-id: <deviceId>
x-device-token: <deviceToken>
```

Request:

```ts
export type DeviceCheckInRequest = {
  deviceId: string;
  name?: string;
  location?: string;
};
```

Response:

```ts
export type DeviceCheckInResponse = {
  message: string;
  deviceType: "kiosk" | "barrier_gate";
  status: string;
  device: DeviceInfo;
};
```

Frontend behavior:

- เรียกตอนเปิด app
- เรียกซ้ำทุก 30-60 วินาทีเพื่อ heartbeat
- ถ้าได้ `403` และ status เป็น maintenance ให้แสดงหน้า “อุปกรณ์อยู่ระหว่างบำรุงรักษา”
- ถ้าได้ `401` ให้ล้าง credential และกลับหน้า activate

---

## 6. Config / Theme

Endpoint:

```http
GET /api/v1/devices/config
```

Response:

```ts
export type PublicDeviceConfigResponse = {
  theme: {
    systemName: string | null;
    themeColor: string | null;
    logoUrl: string | null;
    themeMode: string;
    customThemeColor: string | null;
    updatedAt: string | null;
  };
};
```

Frontend behavior:

- ใช้ `systemName` แสดงชื่อระบบ
- เลือกสีหลักตาม `themeMode`:
  - ถ้า `themeMode === "theme"` ให้ใช้ `themeColor`
  - ถ้า `themeMode === "custom"` ให้ใช้ `customThemeColor`
  - ถ้าค่าสีที่เลือกว่าง, `null`, หรือไม่ใช่ HEX ที่ถูกต้อง ให้ fallback เป็น `#FFD54F`
- ใช้ `logoUrl` แสดง logo
- ถ้า logoUrl ขึ้นต้นด้วย `/uploads` ให้ต่อกับ `API_BASE_URL`

```ts
export function resolveAssetUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("/uploads")) return `${API_BASE_URL}${url}`;
  return url;
}

const DEFAULT_THEME_COLOR = "#FFD54F";

function isHexColor(value: string) {
  return /^#[0-9A-F]{6}$/i.test(value);
}

export function resolveThemeColor(theme: PublicDeviceConfigResponse["theme"]) {
  const sourceColor =
    theme.themeMode === "custom"
      ? theme.customThemeColor
      : theme.themeMode === "theme"
        ? theme.themeColor
        : null;

  if (!sourceColor || !isHexColor(sourceColor)) {
    return DEFAULT_THEME_COLOR;
  }

  return sourceColor;
}
```

---

## 7. Transaction Search

### Search by plateNo

Endpoint:

```http
GET /api/v1/client/transaction?plateNo={plateNo}&deviceId={deviceId}
```

### Search by transaction id or plateNo

Endpoint:

```http
GET /api/v1/client/transaction/{id}?deviceId={deviceId}
```

Response:

```ts
export type ClientTransactionResponse = {
  transactionId: string;
  billNo: string;
  plateNo: string;
  vehicleType: "car" | "motorcycle" | string;
  entryAt: string | null;
  calculatedAt: string | null;
  exitTimeLimit: string | null;
  isOverstay: boolean;
  status: string;
  amount: {
    netAmount: number;
    paidAmount: number;
    remainingAmount: number;
  };
  duration: {
    display: string;
    hours: number;
    totalMinutes: number;
  };
  qrData: string;
  clientType: "kiosk" | "barrier_gate" | "mobile" | "public";
  device: DeviceInfo | null;
};
```

Error cases:

```ts
export type ClientTransactionError = {
  message: string;
};
```

Possible errors:

- `400 plateNo is required`
- `401 Invalid or unregistered deviceId`
- `403 Device is currently under maintenance`
- `403 This transaction is already processed`
- `404 Transaction not found`

Frontend behavior:

- Normalize input ก่อนส่ง เช่น trim ช่องว่าง
- หน้า Kiosk ให้ user กรอกทะเบียนรถ
- หน้า Barrier Gate อาจรับ plateNo จาก LPR/camera/external input
- ถ้าไม่พบ transaction ให้แสดงข้อความเข้าใจง่าย
- ถ้า already processed ให้แสดงว่า “รายการนี้ถูกดำเนินการแล้ว”
- ถ้า maintenance ให้ lock screen

---

## 8. Payment

### Payment by plateNo path

```http
POST /api/v1/client/{plateNo}/payment
```

### Payment by body

```http
POST /api/v1/client/payment
```

Request:

```ts
export type ClientPaymentRequest = {
  transactionId?: string;
  plateNo?: string;
  method?: "qr" | "cash" | "wallet" | string;
  amount?: number;
  deviceId?: string;
};
```

Response:

```ts
export type ClientPaymentResponse = {
  message: string;
  transaction: ClientTransactionResponse;
  clientType: "kiosk" | "barrier_gate" | "mobile";
  device: DeviceInfo | null;
};
```

Backend behavior สำคัญ:

- ถ้า `deviceType = kiosk`
  - Backend จะใช้ channel เป็น `kiosk`
  - default method เป็น `qr`

- ถ้า `deviceType = barrier_gate`
  - Backend จะใช้ channel เป็น `gate`
  - default method เป็น `wallet`
  - เมื่อ payment ผ่าน channel `gate` Backend จะ set:
    - `exitTimeLimit = paidAt`
    - `exitAt = paidAt`
    - `status = completed`

Frontend behavior:

- Kiosk:
  - ค้นหา transaction
  - แสดงยอด `remainingAmount`
  - แสดง QR จาก `qrData` หรือแสดงช่องทางชำระเงิน
  - เมื่อ confirm payment ให้เรียก payment endpoint
  - หลังจ่ายสำเร็จ แสดง success และเวลาออกจากช่อง `exitTimeLimit`

- Barrier Gate:
  - ห้ามเรียก payment อัตโนมัติถ้ายังไม่มี logic ยืนยันว่าควรเปิดไม้กั้น
  - ถ้าจะใช้ gate payment ต้องแน่ใจว่าเป็น flow ที่ต้องการ close transaction ทันที
  - ถ้าระบบแยก hardware control ให้ทำ adapter เช่น `openBarrierGate()` แยกจาก API client
  - กรณียอดคงเหลือ `remainingAmount > 0` ต้องไม่เปิดไม้กั้น เว้นแต่มี business rule รองรับ

---

## 9. SSE Client Events

Endpoint:

```http
GET /api/v1/client/events?deviceId={deviceId}
```

Headers:

```http
x-device-id: <deviceId>
x-device-token: <deviceToken>
```

Event examples:

```ts
export type ClientSseEvent =
  | {
      type: "connected";
      clientType: "kiosk" | "barrier_gate" | "public";
      message: string;
    }
  | {
      type: "theme_updated";
      theme: PublicDeviceConfigResponse["theme"];
    }
  | {
      type: "ping";
      at: string;
    };
```

Frontend behavior:

- เปิด SSE หลัง activate/check-in สำเร็จ
- เมื่อได้ `theme_updated` ให้ update theme/logo ทันที
- เมื่อได้ `ping` ให้ใช้เพื่อรู้ว่ายังเชื่อมต่ออยู่
- ถ้า connection หลุดให้ reconnect
- Native EventSource ใส่ custom headers ไม่ได้ จึงควรใช้ fetch stream หรือ library เช่น `@microsoft/fetch-event-source` ถ้าจำเป็นต้องส่ง header
- ถ้าไม่เพิ่ม dependency ให้ใช้ polling config เป็น fallback

---

## 10. Shared Types

```ts
export type ISODateString = string;

export type DeviceType = "kiosk" | "barrier_gate";

export type DeviceInfo = {
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  deviceLocation: string | null;
  status: string;
};

export type StoredDeviceCredential = {
  deviceId: string;
  deviceToken: string;
  deviceType: DeviceType;
  deviceName: string;
  location: string | null;
  status: string;
  activatedAt?: ISODateString;
};

export type ApiErrorResponse = {
  message: string;
  reason?: string;
  status?: string;
};

export type DeviceActivateRequest = {
  code: string;
};

export type DeviceActivateResponse = {
  success: boolean;
  message: string;
  deviceToken: string;
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  location: string | null;
  status: string;
};

export type DeviceCheckInRequest = {
  deviceId: string;
  name?: string;
  location?: string;
};

export type DeviceCheckInResponse = {
  message: string;
  deviceType: DeviceType;
  status: string;
  device: DeviceInfo;
};

export type PublicDeviceConfigResponse = {
  theme: {
    systemName: string | null;
    themeColor: string | null;
    logoUrl: string | null;
    themeMode: string;
    customThemeColor: string | null;
    updatedAt: ISODateString | null;
  };
};

export type ClientTransactionResponse = {
  transactionId: string;
  billNo: string;
  plateNo: string;
  vehicleType: "car" | "motorcycle" | string;
  entryAt: ISODateString | null;
  calculatedAt: ISODateString | null;
  exitTimeLimit: ISODateString | null;
  isOverstay: boolean;
  status: string;
  amount: {
    netAmount: number;
    paidAmount: number;
    remainingAmount: number;
  };
  duration: {
    display: string;
    hours: number;
    totalMinutes: number;
  };
  qrData: string;
  clientType: DeviceType | "mobile" | "public";
  device: DeviceInfo | null;
};

export type ClientPaymentRequest = {
  transactionId?: string;
  plateNo?: string;
  method?: "qr" | "cash" | "wallet" | string;
  amount?: number;
  deviceId?: string;
};

export type ClientPaymentResponse = {
  message: string;
  transaction: ClientTransactionResponse;
  clientType: DeviceType | "mobile";
  device: DeviceInfo | null;
};

export type ClientSseEvent =
  | {
      type: "connected";
      clientType: DeviceType | "public";
      message: string;
    }
  | {
      type: "theme_updated";
      theme: PublicDeviceConfigResponse["theme"];
    }
  | {
      type: "ping";
      at: ISODateString;
    };
```

---

## 11. Recommended Folder Structure

ถ้าเป็น Next.js / React project แนะนำแยกประมาณนี้:

```txt
src/
  lib/
    api/
      clientApi.ts
      deviceApi.ts
      deviceConfigApi.ts
    device/
      deviceStorage.ts
      deviceSession.ts
      heartbeat.ts
      sse.ts
      hardwareAdapter.ts
    types/
      client.ts
      device.ts
      config.ts
  features/
    activation/
      ActivateDevicePage.tsx
    kiosk/
      KioskHomePage.tsx
      KioskSearchPlate.tsx
      KioskPaymentSummary.tsx
      KioskPaymentSuccess.tsx
    barrier/
      BarrierGatePage.tsx
      BarrierGateStatus.tsx
      BarrierGateTransactionCheck.tsx
  app/
    kiosk/
    barrier/
    activate/
```

ถ้าเป็น Project เดียว แนะนำมี route/mode แบบนี้:

```txt
/landing/activate
/landing/dashboard
/landing/barrier-gate
```

หรือ auto route จาก device credential:

```ts
if (!credential) redirect("/landing/activate");

if (credential.deviceType === "kiosk") redirect("/landing/dashboard");

if (credential.deviceType === "barrier_gate") redirect("/landing/barrier-gate");
```

ตัวอย่าง localStorage สำหรับ key `carparkDeviceCredential`:

```json
{
  "deviceId": "BG-20260616-002",
  "deviceToken": "0dc22f1916b6e461768696a35ac92514ad8eedf77fb216d3188dc17e10adc4f6",
  "deviceType": "barrier_gate",
  "deviceName": "Test Barrier Gate",
  "status": "active",
  "activatedAt": "2026-06-16T03:32:34.846Z"
}
```

---

## 12. API Client Requirements

สร้าง API client สำหรับ device โดยไม่ปนกับ Admin API

```ts
export async function deviceRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const credential = getStoredDeviceCredential();

  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (credential?.deviceId) {
    headers.set("x-device-id", credential.deviceId);
  }

  if (credential?.deviceToken) {
    headers.set("x-device-token", credential.deviceToken);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    throw new DeviceApiError(response.status, data);
  }

  return response.json() as Promise<T>;
}
```

ต้องมี error handling:

- `400` input invalid
- `401` device credential invalid
- `403` maintenance หรือ transaction processed
- `404` transaction not found
- network error / API offline

---

## 13. Kiosk UI Requirements

Kiosk ควรรองรับ:

1. หน้า Activate Device
2. หน้า Loading / Checking device
3. หน้า Maintenance
4. หน้า Home / Search plate
5. หน้า Transaction Summary
6. หน้า Payment Method / QR
7. หน้า Payment Success
8. หน้า Error / Not Found
9. Auto reset กลับหน้า Home หลังจบรายการ
10. ปุ่มกลับ / ปุ่มเริ่มใหม่ / timeout idle

### Kiosk Search Flow

```txt
User input plateNo
↓
GET /api/v1/client/transaction?plateNo=...&deviceId=...
↓
Show amount.remainingAmount
↓
Confirm payment
↓
POST /api/v1/client/payment
↓
Show success
↓
Auto reset
```

---

## 14. Barrier Gate UI / Logic Requirements

Barrier Gate ควรรองรับ:

1. หน้า Activate Device
2. หน้า Device status
3. หน้า Maintenance
4. หน้า Waiting for plate / LPR input
5. หน้า Checking transaction
6. หน้า Open gate / Denied / Error
7. Heartbeat
8. Hardware adapter layer

### Barrier Gate Flow

```txt
Receive plateNo from camera/LPR/external input
↓
GET /api/v1/client/transaction?plateNo=...&deviceId=...
↓
Check amount.remainingAmount
↓
If remainingAmount <= 0 and status allowed by business rule
  → openBarrierGate()
Else
  → deny / require payment at kiosk
```

### Hardware Adapter

ห้ามผูก UI กับ hardware โดยตรง ให้แยก layer เช่น:

```ts
export type BarrierHardwareAdapter = {
  openGate: () => Promise<void>;
  closeGate?: () => Promise<void>;
  getStatus?: () => Promise<unknown>;
};
```

กรณียังไม่มี hardware จริง ให้ทำ mock adapter ไว้ แต่ต้องแยกให้เปลี่ยนเป็น serial/relay/MQTT/API ได้ภายหลัง

---

# 15. Prompt สำหรับ Codex: Review ก่อนแก้

ใช้ Prompt นี้เมื่ออยากให้ Codex ตรวจสอบก่อน ยังไม่แก้ไฟล์

```txt
อ่าน AGENTS.md และไฟล์ specification ของ Kiosk/Barrier Gate Frontend นี้ให้ครบก่อน แล้วทำงานตาม instruction อย่างเคร่งครัด

งานนี้ให้ตรวจสอบ Project Frontend ปัจจุบันสำหรับตู้ Kiosk และ Barrier Gate ซึ่งเป็น Project เดียวกัน ว่าตรงกับ Backend API Contract ล่าสุดหรือไม่

เป้าหมายการตรวจสอบ:
1. ตรวจว่า Project มี flow activation สำหรับอุปกรณ์หรือยัง
2. ตรวจว่าใช้ endpoint ถูกต้องหรือไม่:
   - GET /api/v1/devices/config
   - POST /api/v1/client/activate
   - POST /api/v1/client/check-in
   - GET /api/v1/client/transaction
   - GET /api/v1/client/transaction/:id
   - POST /api/v1/client/payment
   - POST /api/v1/client/:plateNo/payment
   - GET /api/v1/client/events
3. ตรวจว่าไม่ได้ใช้ Admin Bearer token กับ Kiosk/Barrier Gate โดยผิดประเภท
4. ตรวจว่าเก็บ deviceId/deviceToken/deviceType หลัง activate ถูกต้องหรือไม่
5. ตรวจว่า device APIs ส่ง x-device-id และ x-device-token ถูกต้องหรือไม่
6. ตรวจว่า route/mode แยก Kiosk และ Barrier Gate จาก deviceType ถูกต้องหรือไม่
7. ตรวจว่า check-in/heartbeat มีหรือไม่ และจัดการ 401/403/maintenance ถูกต้องหรือไม่
8. ตรวจว่า Kiosk search/payment flow ใช้ response field ถูกต้องหรือไม่
9. ตรวจว่า Barrier Gate logic ไม่เปิดไม้กั้นถ้ายอด remainingAmount > 0
10. ตรวจว่า hardware control ถูกแยกเป็น adapter ไม่ผูกกับ UI โดยตรง
11. ตรวจว่า theme/logo/config จาก GET /api/v1/devices/config ถูกนำมาใช้จริงหรือไม่
12. ตรวจว่า SSE /api/v1/client/events ใช้งานได้ หรือมี fallback polling
13. ตรวจว่า TypeScript types ตรงกับ Backend response จริงหรือไม่
14. ตรวจว่าไม่มี mock data เหลือใน flow ที่ควรใช้ API จริง
15. ตรวจว่า error/loading/empty/offline/maintenance state ครบหรือไม่

ข้อกำหนด:
- ห้ามแก้ไฟล์ก่อน
- ห้าม refactor ใหญ่
- ห้ามเพิ่ม dependency
- ห้ามเปลี่ยน UI เดิมถ้าไม่จำเป็น
- ให้ระบุไฟล์ที่เกี่ยวข้องทั้งหมดก่อน
- ให้สรุปปัญหาเป็น Critical / High / Medium / Low
- ให้เสนอแผนแก้ไขทีละขั้นตอนก่อนเริ่มแก้

Output ที่ต้องการ:
1. สรุปภาพรวมว่า Frontend ตรงกับ Backend Contract กี่เปอร์เซ็นต์โดยประมาณ
2. รายการไฟล์ที่เกี่ยวข้อง
3. ตารางปัญหา: File / Issue / Backend Expected / Current Frontend / Risk / Suggested Fix
4. แผนแก้ไขตามลำดับ
5. จุดที่ต้องถามเจ้าของ Project ก่อนแก้ ถ้ามี
6. ยังไม่ต้องแก้โค้ดในรอบนี้
```

---

# 16. Prompt สำหรับ Codex: เริ่มแก้ปรับปรุง

ใช้ Prompt นี้หลังจาก Review แล้ว และต้องการให้ Codex เริ่มแก้

```txt
จากผลการ Review ก่อนหน้า ให้เริ่มแก้ Project Frontend สำหรับ Kiosk และ Barrier Gate ให้ตรงกับ Backend API Contract ล่าสุดตาม specification นี้

ข้อกำหนดการแก้:
1. แก้แบบ incremental ทีละส่วน
2. ห้าม refactor ใหญ่โดยไม่จำเป็น
3. รักษา UI/UX เดิมให้มากที่สุด
4. แยก API client ของ device ออกจาก Admin API client
5. สร้าง/ปรับ TypeScript types ให้ตรงกับ Backend response
6. เพิ่ม/แก้ device storage สำหรับ deviceId, deviceToken, deviceType, deviceName, location, status
7. เพิ่ม/แก้ activation flow:
   - POST /api/v1/client/activate
   - บันทึก credential
   - redirect ตาม deviceType
8. เพิ่ม/แก้ check-in/heartbeat:
   - POST /api/v1/client/check-in
   - ส่ง x-device-id และ x-device-token
   - จัดการ 401/403/maintenance
9. เพิ่ม/แก้ config/theme:
   - GET /api/v1/devices/config
   - apply theme/logo/systemName
10. เพิ่ม/แก้ Kiosk flow:
   - search plate
   - show transaction amount
   - payment
   - success/error state
11. เพิ่ม/แก้ Barrier Gate flow:
   - receive plateNo/transactionId
   - check transaction
   - allow/deny logic
   - ห้ามเปิดไม้กั้นถ้า remainingAmount > 0
   - แยก hardwareAdapter
12. เพิ่ม/แก้ SSE หรือ fallback polling:
   - GET /api/v1/client/events?deviceId=...
   - update theme เมื่อได้ theme_updated
13. ลบหรือปิด mock data ใน flow ที่ใช้ API จริงแล้ว
14. จัด loading/error/empty/offline/maintenance state ให้ครบ
15. หลังแก้แต่ละส่วน ให้สรุปไฟล์ที่แก้และเหตุผล

ลำดับการแก้:
1. shared types
2. deviceApi/clientApi
3. deviceStorage/deviceSession
4. activation flow
5. check-in/heartbeat
6. config/theme loader
7. Kiosk search/payment flow
8. Barrier Gate transaction/open-deny flow
9. SSE หรือ fallback polling
10. cleanup mock data
11. test/build

หลังแก้เสร็จ ให้รัน command ที่ project มีจริงใน package.json เช่น:
- npm run typecheck
- npm run lint
- npm run build

ถ้า script ใดไม่มี ให้แจ้งว่าไม่มี script นั้นและข้ามอย่างมีเหตุผล

รายงานผลลัพธ์สุดท้าย:
- แก้ไฟล์ไหนบ้าง
- เพิ่ม type/API อะไรบ้าง
- flow ไหนใช้งานได้แล้ว
- จุดไหนยังต้องเชื่อม hardware จริง
- วิธีทดสอบ manual
- ผล typecheck/lint/build
```

---

# 17. Manual Test Checklist

## Activation

- [ ] เปิด app ครั้งแรกแล้วไปหน้า activate
- [ ] กรอก code ว่างแล้วขึ้น error
- [ ] กรอก code ผิดแล้วขึ้น invalid/expired
- [ ] กรอก code ถูกแล้วบันทึก device credential
- [ ] redirect ไป `/kiosk` หรือ `/barrier` ตาม deviceType

## Check-in / Heartbeat

- [ ] เปิด app แล้ว check-in สำเร็จ
- [ ] heartbeat ทำงานซ้ำ
- [ ] token ผิดแล้วกลับหน้า activate
- [ ] device maintenance แล้วแสดงหน้า maintenance

## Kiosk

- [ ] ค้นหา plateNo สำเร็จ
- [ ] ไม่พบ plateNo แสดง not found
- [ ] แสดงยอด net/paid/remaining ถูกต้อง
- [ ] กดจ่ายเงินแล้ว payment success
- [ ] หลัง success reset กลับหน้า home

## Barrier Gate

- [ ] รับ plateNo ได้
- [ ] ค้นหา transaction ได้
- [ ] remainingAmount > 0 แล้วไม่เปิดไม้กั้น
- [ ] เงื่อนไขผ่านแล้วเรียก hardwareAdapter.openGate()
- [ ] hardware error แล้วแสดง error/ไม่ค้าง

## Theme / Config

- [ ] โหลด systemName
- [ ] โหลด logo
- [ ] logo `/uploads/...` แสดงถูกต้อง
- [ ] theme_updated แล้ว UI update

## Build

- [ ] typecheck ผ่าน
- [ ] lint ผ่าน
- [ ] build ผ่าน

---

# End of Document
