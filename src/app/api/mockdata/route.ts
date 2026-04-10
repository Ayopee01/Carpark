import { NextRequest, NextResponse } from "next/server";

type MockPlateData = {
  plate: string;
  province: string;
  date: string;
  entryTime: string;
  duration: string;
  paymentStatus: string;
  amount: number;
  paymentMethod: string;
};

const mockData: MockPlateData = {
  plate: "1กข 1234",
  province: "กรุงเทพมหานคร",
  date: "7/4/2569",
  entryTime: "10.36 น.",
  duration: "3 ชั่วโมง 30 นาที",
  paymentStatus: "ยังไม่ชำระค่าบริการ",
  amount: 800,
  paymentMethod: "PromPay",
};

function normalizePlate(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export async function GET(req: NextRequest) {
  const plate = req.nextUrl.searchParams.get("plate") ?? "";

  if (!plate) {
    return NextResponse.json(
      { ok: false, message: "plate is required" },
      { status: 400 }
    );
  }

  const isMatched =
    normalizePlate(plate) === normalizePlate(mockData.plate);

  if (!isMatched) {
    return NextResponse.json(
      { ok: false, message: "not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: mockData,
  });
}