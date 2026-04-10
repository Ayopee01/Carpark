import { NextRequest, NextResponse } from "next/server";
import type {
  PlateDetail,
  PlateSearchNotFoundResponse,
  PlateSearchSuccessResponse,
} from "@/src/app/type/search";

type MockPlateRecord = {
  plateNo: string;
  province: string;
  date: string;
  entryTime: string;
  paymentStatus: string;
  paymentMethod: string;
};

const ADMIN_HOURLY_RATE = 20;

const mockPlates: MockPlateRecord[] = [
  {
    plateNo: "1กข1234",
    province: "กรุงเทพมหานคร",
    date: "2026-04-10",
    entryTime: "08:15:00+07:00",
    paymentStatus: "ยังไม่ชำระเงิน",
    paymentMethod: "QR Payment",
  },
  {
    plateNo: "2ขค5678",
    province: "ปทุมธานี",
    date: "2026-04-10",
    entryTime: "08:15:00+07:00",
    paymentStatus: "ยังไม่ชำระเงิน",
    paymentMethod: "QR Payment",
  },
];

const normalizePlate = (value: string) => value.replace(/\s+/g, "").trim();

function buildEntryDate(date: string, entryTime: string): Date {
  return new Date(`${date}T${entryTime}`);
}

function formatThaiDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatThaiTimeOnly(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} ชม. ${minutes} นาที`;
  }

  if (hours > 0) {
    return `${hours} ชม.`;
  }

  return `${minutes} นาที`;
}

function calculateAmount(totalMinutes: number, hourlyRate: number): number {
  const billableHours = Math.max(1, Math.ceil(totalMinutes / 60));
  return billableHours * hourlyRate;
}

function mapMockToPlateDetail(
  record: MockPlateRecord,
  now: Date,
  hourlyRate: number
): PlateDetail {
  const entryDate = buildEntryDate(record.date, record.entryTime);
  const durationMs = now.getTime() - entryDate.getTime();
  const durationMinutes = Math.max(0, Math.floor(durationMs / 60000));

  return {
    plate: record.plateNo,
    province: record.province,
    date: formatThaiDateOnly(entryDate),
    entryTime: formatThaiTimeOnly(entryDate),
    duration: formatDuration(durationMinutes),
    paymentStatus: record.paymentStatus,
    amount: calculateAmount(durationMinutes, hourlyRate),
    paymentMethod: record.paymentMethod,
  };
}

export async function GET(req: NextRequest) {
  const plate = req.nextUrl.searchParams.get("plate")?.trim();

  if (!plate) {
    const response: PlateSearchNotFoundResponse = {
      ok: false,
      message: "กรุณาระบุเลขทะเบียนรถ",
      data: null,
    };

    return NextResponse.json(response, { status: 404 });
  }

  const normalizedPlate = normalizePlate(plate);

  const foundPlate = mockPlates.find(
    (item) => normalizePlate(item.plateNo) === normalizedPlate
  );

  if (!foundPlate) {
    const response: PlateSearchNotFoundResponse = {
      ok: false,
      message: "ไม่พบข้อมูลทะเบียนรถ",
      data: null,
    };

    return NextResponse.json(response, { status: 404 });
  }

  const now = new Date();

  const plateDetail = mapMockToPlateDetail(
    foundPlate,
    now,
    ADMIN_HOURLY_RATE
  );

  const response: PlateSearchSuccessResponse = {
    ok: true,
    message: "ค้นหาสำเร็จ",
    data: plateDetail,
  };

  return NextResponse.json(response, { status: 200 });
}