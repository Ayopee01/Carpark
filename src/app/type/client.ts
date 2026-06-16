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
