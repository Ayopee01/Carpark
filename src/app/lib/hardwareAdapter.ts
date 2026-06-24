// Demo ต้องพัฒนาต่อให้สามารถเชื่อมต่อกับ Hardware จริงได้

// Type สำหรับ Hardware Adapter ของ Barrier Gate
export type BarrierHardwareAdapter = {
    openGate: () => Promise<void>;
    closeGate?: () => Promise<void>;
    getStatus?: () => Promise<unknown>;
};

// Function สำหรับสร้าง Hardware Adapter ของ Barrier Gate
export const barrierHardwareAdapter: BarrierHardwareAdapter = {
    // ตัวอย่างการเปิดประตู Barrier Gate (Mock)
    async openGate() {
        console.info("Mock barrier gate opened");
    },
};
