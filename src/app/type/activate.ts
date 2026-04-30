type KioskConfigResponse = {
    theme: {
        themeName: string;
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl: string | null;
        updatedAt: string;
    };
    systemName: string;
    status: string;
};