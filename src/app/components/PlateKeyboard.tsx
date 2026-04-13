"use client";

// Import Libraries
import { FiDelete } from "react-icons/fi";
// Types
import type { KeyboardItem, PlateSearchResponse } from "@/src/app/type/search";

// ------------------------------- Types -------------------------------
type PlateKeyboardProps = {
    rows: KeyboardItem[][];
    loading: boolean;
    confirmText: string;
    onKeyClick: (key: string) => void;
    onDelete: () => void;
    onConfirm: () => void;
};

export type FetchPlateResult = {
    status: number;
    result: PlateSearchResponse | null;
};

// ------------------------------- Keyboard Layout -------------------------------
export const plateKeyboardRows: KeyboardItem[][] = [
    [
        { type: "key", value: "1" },
        { type: "key", value: "6" },
        { type: "key", value: "ก" },
        { type: "key", value: "ข" },
        { type: "key", value: "ค" },
        { type: "key", value: "ง" },
        { type: "key", value: "จ" },
        { type: "key", value: "ฉ" },
        { type: "key", value: "ช" },
        { type: "key", value: "ซ" },
        { type: "key", value: "ญ" },
    ],
    [
        { type: "key", value: "2" },
        { type: "key", value: "7" },
        { type: "key", value: "ฎ" },
        { type: "key", value: "ฏ" },
        { type: "key", value: "ฐ" },
        { type: "key", value: "ณ" },
        { type: "key", value: "ด" },
        { type: "key", value: "ต" },
        { type: "key", value: "ถ" },
        { type: "key", value: "ท" },
        { type: "key", value: "ธ" },
    ],
    [
        { type: "key", value: "3" },
        { type: "key", value: "8" },
        { type: "key", value: "น" },
        { type: "key", value: "บ" },
        { type: "key", value: "ป" },
        { type: "key", value: "ผ" },
        { type: "key", value: "ฝ" },
        { type: "key", value: "พ" },
        { type: "key", value: "ฟ" },
        { type: "key", value: "ภ" },
        { type: "key", value: "ม" },
    ],
    [
        { type: "key", value: "4" },
        { type: "key", value: "9" },
        { type: "key", value: "ย" },
        { type: "key", value: "ร" },
        { type: "key", value: "ล" },
        { type: "key", value: "ว" },
        { type: "key", value: "ศ" },
        { type: "key", value: "ษ" },
        { type: "key", value: "ส" },
        { type: "delete" },
    ],
    [
        { type: "key", value: "5" },
        { type: "key", value: "0" },
        { type: "key", value: "ห" },
        { type: "key", value: "อ" },
        { type: "key", value: "ฮ" },
        { type: "confirm" }
    ],
];

// ------------------------------- Fetch Helpers -------------------------------
function safeParsePlateResponse(text: string): PlateSearchResponse | null {
    try {
        return text ? (JSON.parse(text) as PlateSearchResponse) : null;
    } catch {
        return null;
    }
}

async function readResponseTextWithProgress(
    response: Response,
    onProgress: (value: number) => void
): Promise<string | null> {
    if (!response.body) {
        return null;
    }

    const total = Number(response.headers.get("content-length") ?? 0);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let received = 0;
    let text = "";

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (!value) continue;

        received += value.byteLength;
        text += decoder.decode(value, { stream: true });

        if (total > 0) {
            const percent = Math.round((received / total) * 100);
            onProgress(Math.min(percent, 100));
        }
    }

    text += decoder.decode();
    return text;
}

// ------------------------------- Function -------------------------------
export async function fetchPlateWithProgress(
    url: string,
    onProgress: (value: number) => void
): Promise<FetchPlateResult> {
    onProgress(0);

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
    });

    if (!response.body) {
        const result = (await response.json().catch(() => null)) as PlateSearchResponse | null;

        onProgress(100);

        return {
            status: response.status,
            result,
        };
    }

    const responseText = await readResponseTextWithProgress(response, onProgress);
    const result = safeParsePlateResponse(responseText ?? "");

    onProgress(100);

    return {
        status: response.status,
        result,
    };
}

// ------------------------------- Component -------------------------------
function PlateKeyboard({
    rows,
    loading,
    confirmText,
    onKeyClick,
    onDelete,
    onConfirm,
}: PlateKeyboardProps) {
    const renderButton = (item: KeyboardItem, key: string) => {
        switch (item.type) {
            case "key":
                return (
                    <button
                        key={key}
                        type="button"
                        className="plate-keyboard__key"
                        onClick={() => onKeyClick(item.value)}
                        disabled={loading}
                    >
                        {item.value}
                    </button>
                );

            case "delete":
                return (
                    <button
                        key={key}
                        type="button"
                        className="plate-keyboard__action plate-keyboard__action--delete"
                        onClick={onDelete}
                        aria-label="delete"
                        disabled={loading}
                    >
                        <FiDelete />
                    </button>
                );

            case "confirm":
                return (
                    <button
                        key={key}
                        type="button"
                        className="plate-keyboard__action plate-keyboard__action--confirm"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {confirmText}
                    </button>
                );

            default:
                return null;
        }
    };

    // ----------------------------------- UI -----------------------------------
    return (
        <div className="plate-keyboard-container">
            <div className="plate-keyboard">
                {rows.map((row, rowIndex) =>
                    row.map((item, itemIndex) =>
                        renderButton(item, `${rowIndex}-${itemIndex}`)
                    )
                )}
            </div>
        </div>
    );
}

export default PlateKeyboard;