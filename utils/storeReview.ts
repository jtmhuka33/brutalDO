import AsyncStorage from "@react-native-async-storage/async-storage";

const REVIEW_REQUESTED_KEY = "@neo_brutal_review_v1";

/**
 * Request a native App Store / Play Store review the first time a task is completed.
 * Subsequent calls are no-ops once the flag is stored.
 * Safe to call in Expo Go — the native module is required lazily.
 */
export async function maybeRequestReview(): Promise<void> {
    try {
        const stored = await AsyncStorage.getItem(REVIEW_REQUESTED_KEY);
        if (stored) return; // Already requested once — never ask again

        await AsyncStorage.setItem(REVIEW_REQUESTED_KEY, "true");

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const StoreReview = require("expo-store-review");
        const available = await StoreReview.isAvailableAsync();
        if (available) {
            await StoreReview.requestReview();
        }
    } catch (e) {
        console.error("[StoreReview] Failed to request review:", e);
    }
}

/** Dev-only: clear the stored flag so the review prompt can be triggered again. */
export async function devResetReviewPrompt(): Promise<void> {
    if (__DEV__) {
        await AsyncStorage.removeItem(REVIEW_REQUESTED_KEY);
    }
}

/** Dev-only: returns whether the review has already been requested. */
export async function devGetReviewStatus(): Promise<boolean> {
    const stored = await AsyncStorage.getItem(REVIEW_REQUESTED_KEY);
    return stored !== null;
}
