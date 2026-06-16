export type BarrierHardwareAdapter = {
    openGate: () => Promise<void>;
    closeGate?: () => Promise<void>;
    getStatus?: () => Promise<unknown>;
};

export const barrierHardwareAdapter: BarrierHardwareAdapter = {
    async openGate() {
        console.info("Mock barrier gate opened");
    },
};
