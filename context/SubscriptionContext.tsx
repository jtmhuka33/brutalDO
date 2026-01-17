import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import {
    SubscriptionTier,
    SubscriptionStatus,
    SubscriptionProduct,
} from "@/types/subscription";

const STORAGE_KEY = "@subscription_premium_v1";

interface SubscriptionContextType {
    isPremium: boolean;
    isLoading: boolean;
    isReady: boolean;
    error: string | null;
    products: SubscriptionProduct[];
    isPurchasing: boolean;
    isRestoring: boolean;
    purchase: (productId: string) => Promise<boolean>;
    restore: () => Promise<boolean>;
    clearError: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const [tier, setTier] = useState<SubscriptionTier>("free");
    const [status, setStatus] = useState<SubscriptionStatus>("loading");
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<SubscriptionProduct[]>([]);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    // Load cached premium status
    const loadCachedStatus = useCallback(async () => {
        try {
            const cached = await AsyncStorage.getItem(STORAGE_KEY);
            if (cached === "true") {
                setTier("premium");
            }
        } catch (e) {
            console.error("Failed to load cached subscription status:", e);
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        const initialize = async () => {
            // Load cached status first for offline support
            await loadCachedStatus();

            // For now, IAP is disabled until a development build is created
            // This allows the app to work in Expo Go
            console.log("IAP: Running in mock mode (Expo Go or simulator)");
            setStatus("ready");
        };

        initialize();
    }, [loadCachedStatus]);

    const purchase = useCallback(
        async (_productId: string): Promise<boolean> => {
            setError("In-app purchases require a development build. Please build the app with 'npx expo run:android' or 'npx expo run:ios'.");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return false;
        },
        []
    );

    const restore = useCallback(async (): Promise<boolean> => {
        setError("In-app purchases require a development build. Please build the app with 'npx expo run:android' or 'npx expo run:ios'.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return false;
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: SubscriptionContextType = {
        isPremium: tier === "premium",
        isLoading: status === "loading",
        isReady: status === "ready",
        error,
        products,
        isPurchasing,
        isRestoring,
        purchase,
        restore,
        clearError,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error("useSubscription must be used within a SubscriptionProvider");
    }
    return context;
}
