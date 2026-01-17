import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIAP, finishTransaction } from "expo-iap";
import * as Haptics from "expo-haptics";

import {
    SubscriptionTier,
    SubscriptionStatus,
    SubscriptionProduct,
    PRODUCT_IDS,
    ALL_PRODUCT_SKUS,
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

function mapProductType(productId: string): "monthly" | "yearly" | "lifetime" {
    if (productId === PRODUCT_IDS.monthly) return "monthly";
    if (productId === PRODUCT_IDS.yearly) return "yearly";
    return "lifetime";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(product: any): SubscriptionProduct {
    return {
        id: product.id,
        title: product.title || "Premium",
        description: product.description || "",
        price: product.displayPrice || "$0.00",
        priceAmount: product.price || 0,
        currency: product.currency || "USD",
        type: mapProductType(product.id),
    };
}

// Save premium status to cache
const savePremiumStatus = async (isPremium: boolean) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, isPremium ? "true" : "false");
    } catch (e) {
        console.error("Failed to save subscription status:", e);
    }
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const [tier, setTier] = useState<SubscriptionTier>("free");
    const [status, setStatus] = useState<SubscriptionStatus>("loading");
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<SubscriptionProduct[]>([]);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const {
        connected,
        products: iapProducts,
        subscriptions,
        fetchProducts,
        getAvailablePurchases,
        availablePurchases,
        requestPurchase,
    } = useIAP({
        onPurchaseSuccess: async (purchase) => {
            try {
                await finishTransaction({ purchase, isConsumable: false });
                await savePremiumStatus(true);
                setTier("premium");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
                console.error("Failed to finish transaction:", e);
            } finally {
                setIsPurchasing(false);
            }
        },
        onPurchaseError: (err) => {
            console.error("Purchase error:", err);
            setError("Purchase failed. Please try again.");
            setIsPurchasing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
    });

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

    // Initialize and fetch products when connected
    useEffect(() => {
        const initialize = async () => {
            // Load cached status first for offline support
            await loadCachedStatus();

            if (!connected) {
                // Give it a moment to connect, then mark as ready
                setTimeout(() => {
                    setStatus("ready");
                }, 1000);
                return;
            }

            try {
                // Fetch subscription products
                await fetchProducts({
                    skus: [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly],
                    type: "subs",
                });

                // Also fetch lifetime as in-app purchase
                await fetchProducts({
                    skus: [PRODUCT_IDS.lifetime],
                    type: "in-app",
                });

                setStatus("ready");
            } catch (e) {
                console.error("Failed to fetch products:", e);
                setError("Unable to connect to store");
                setStatus("ready"); // Still allow app to work
            }
        };

        initialize();
    }, [connected, fetchProducts, loadCachedStatus]);

    // Map IAP products to our format
    useEffect(() => {
        const allProducts = [...(iapProducts || []), ...(subscriptions || [])];
        if (allProducts.length > 0) {
            const mapped = allProducts
                .filter((p: { id: string }) => ALL_PRODUCT_SKUS.includes(p.id as typeof ALL_PRODUCT_SKUS[number]))
                .map(mapProduct);
            setProducts(mapped);
        }
    }, [iapProducts, subscriptions]);

    // Check available purchases for premium status
    useEffect(() => {
        if (availablePurchases && availablePurchases.length > 0) {
            const hasPremium = availablePurchases.some((p: { productId: string }) =>
                ALL_PRODUCT_SKUS.includes(p.productId as typeof ALL_PRODUCT_SKUS[number])
            );
            if (hasPremium) {
                setTier("premium");
                savePremiumStatus(true);
            }
        }
    }, [availablePurchases]);

    const purchase = useCallback(
        async (productId: string): Promise<boolean> => {
            if (!connected) {
                setError("Store not connected. Please check your internet connection.");
                return false;
            }

            setIsPurchasing(true);
            setError(null);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
                const allProducts = [...(iapProducts || []), ...(subscriptions || [])];
                const product = allProducts.find((p: { id: string }) => p.id === productId);

                if (!product) {
                    throw new Error("Product not found");
                }

                const isSubscription = productId !== PRODUCT_IDS.lifetime;

                if (isSubscription) {
                    // Handle subscription with offer tokens for Android
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const subProduct = product as any;
                    const offers = subProduct.subscriptionOffers
                        ?.filter((o: { offerTokenAndroid?: string }) => o.offerTokenAndroid)
                        .map((o: { offerTokenAndroid: string }) => ({
                            sku: product.id,
                            offerToken: o.offerTokenAndroid,
                        })) || [];

                    await requestPurchase({
                        request: {
                            apple: { sku: productId },
                            google: {
                                skus: [productId],
                                subscriptionOffers: offers.length > 0 ? offers : undefined,
                            },
                        },
                        type: "subs",
                    });
                } else {
                    // Handle lifetime as in-app purchase
                    await requestPurchase({
                        request: {
                            apple: { sku: productId },
                            google: { skus: [productId] },
                        },
                        type: "in-app",
                    });
                }

                return true;
            } catch (e) {
                console.error("Purchase failed:", e);
                setError("Purchase failed. Please try again.");
                setIsPurchasing(false);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return false;
            }
        },
        [connected, iapProducts, subscriptions, requestPurchase]
    );

    const restore = useCallback(async (): Promise<boolean> => {
        if (!connected) {
            setError("Store not connected. Please check your internet connection.");
            return false;
        }

        setIsRestoring(true);
        setError(null);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            await getAvailablePurchases();

            // Give a moment for availablePurchases to update
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if any purchases grant premium
            const hasPremium = availablePurchases?.some((p: { productId: string }) =>
                ALL_PRODUCT_SKUS.includes(p.productId as typeof ALL_PRODUCT_SKUS[number])
            );

            if (hasPremium) {
                setTier("premium");
                await savePremiumStatus(true);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setIsRestoring(false);
                return true;
            } else {
                setError("No purchases found to restore.");
                setIsRestoring(false);
                return false;
            }
        } catch (e) {
            console.error("Restore failed:", e);
            setError("Unable to restore purchases. Please try again.");
            setIsRestoring(false);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return false;
        }
    }, [connected, getAvailablePurchases, availablePurchases]);

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
