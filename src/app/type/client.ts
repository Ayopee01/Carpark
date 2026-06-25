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

export type ClientTransactionCandidate = {
    plateNo: string;
    billNo: string;
    vehicleType: "car" | "motorcycle" | string;
    status: string;
    entryAt: ISODateString | null;
    exitAt: ISODateString | null;
    exitTimeLimit: ISODateString | null;
};

export type ClientTransactionMultipleResponse = {
    matchType: "multiple";
    requiresSelection: true;
    query: string;
    candidates: ClientTransactionCandidate[];
    clientType?: DeviceType | "mobile" | "public";
    device?: DeviceInfo | null;
};

export type ClientTransactionSearchResponse =
    | ClientTransactionResponse
    | ClientTransactionMultipleResponse;

export type ClientPaymentRequest = {
    plateNo: string;
    method?: "qr" | "cash" | "wallet" | string;
    amount?: number;
    deviceId?: string;
};

export type OmisePaymentQr = {
    object?: string | null;
    type?: string | null;
    image?: string | {
        object?: string | null;
        location?: string | null;
    } | null;
    imageUrl?: string | null;
    image_url?: string | null;
    scannableCode?: {
        image?: {
            downloadUri?: string | null;
            download_uri?: string | null;
            uri?: string | null;
        } | null;
    } | null;
    scannable_code?: {
        image?: {
            download_uri?: string | null;
            downloadUri?: string | null;
            uri?: string | null;
        } | null;
    } | null;
};

export type OmiseChargeResponse = {
    message: string;
    clientType: DeviceType | "mobile";
    device: DeviceInfo | null;
    charge: {
        provider: "omise";
        chargeId: string;
        status: string;
        amount: number;
        currency: "thb" | string;
        plateNo: string;
        method: "promptpay" | string;
        channel: "kiosk" | string;
        qr?: OmisePaymentQr | null;
        source?: {
            scannableCode?: OmisePaymentQr["scannableCode"];
            scannable_code?: OmisePaymentQr["scannable_code"];
        } | null;
        scannableCode?: OmisePaymentQr["scannableCode"];
        scannable_code?: OmisePaymentQr["scannable_code"];
        authorizeUri?: string | null;
        authorize_uri?: string | null;
    };
};

export type OmisePaymentUpdatedEvent = {
    type: "payment_updated";
    provider: "omise";
    chargeId: string;
    plateNo: string;
    paymentStatus: "successful" | "failed" | "expired" | string;
    transactionStatus: string;
    remainingAmount: number;
    exitTimeLimit: ISODateString | null;
};

export type ClientPaymentResponse = {
    message: string;
    transaction: ClientTransactionResponse;
    clientType: DeviceType | "mobile";
    device: DeviceInfo | null;
};

export type LprAction =
    | "OPEN_GATE"
    | "PAYMENT_REQUIRED"
    | "IGNORE_DUPLICATE"
    | "IGNORE_ACTIVE_TRANSACTION"
    | "TRANSACTION_NOT_FOUND";

export type LprDirection = "IN" | "OUT";

export type LprDetectedEvent = {
    type: "lpr_detected";
    success: boolean;
    action: LprAction;
    message: string;
    transactionId: string;
    plateNo: string;
    vehicleType: string;
    cameraId: string;
    gateId: string;
    direction: LprDirection;
    status: string;
    exitTimeLimit: ISODateString | null;
    capturedAt: ISODateString;
    emittedAt: ISODateString;
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
    }
    | LprDetectedEvent;
