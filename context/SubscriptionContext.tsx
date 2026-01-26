import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
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
    // Dev-only: Toggle premium status for testing (only works in __DEV__)
    devSetPremium: (premium: boolean) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function mapProductType(productId: string): "monthly" | "yearly" | "lifetime" {
    if (productId === PRODUCT_IDS.monthly) return "monthly";
    if (productId === PRODUCT_IDS.yearly) return "yearly";
    return "lifetime";
}

// Helper to get product ID from various possible property names
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getProductId(product: any): string {
    // expo-iap can use different property names depending on platform and context
    // Products: 'id' (iOS) or 'productId' (Android)
    // Purchases: might use 'productId', 'sku', 'productIdentifier', etc.
    return (
        product.productId ||
        product.id ||
        product.sku ||
        product.productIdentifier ||
        ""
    );
}

// Helper to check if a product ID matches our premium products
function isPremiumProductId(productId: string): boolean {
    // Exact match first
    if (ALL_PRODUCT_SKUS.includes(productId as typeof ALL_PRODUCT_SKUS[number])) {
        return true;
    }
    // Fallback: check if it contains our app identifier and "premium"
    const lowerProductId = productId.toLowerCase();
    if (lowerProductId.includes("brutaldo") && lowerProductId.includes("premium")) {
        console.log("[IAP] Product ID matched via fallback pattern:", productId);
        return true;
    }
    return false;
}

// Helper to extract localized price from product object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLocalizedPrice(product: any): string {
    // Log the product structure for debugging
    if (__DEV__) {
        console.log("[IAP] Product structure:", JSON.stringify(product, null, 2));
    }

    // iOS StoreKit 2 uses displayPrice
    if (product.displayPrice) {
        return product.displayPrice;
    }

    // Alternative property names
    if (product.localizedPrice) {
        return product.localizedPrice;
    }

    // Android subscriptions: check subscriptionOfferDetails
    if (product.subscriptionOfferDetails?.length > 0) {
        const offer = product.subscriptionOfferDetails[0];
        if (offer.pricingPhases?.pricingPhaseList?.length > 0) {
            const phase = offer.pricingPhases.pricingPhaseList[0];
            if (phase.formattedPrice) {
                return phase.formattedPrice;
            }
        }
    }

    // Android one-time purchases
    if (product.oneTimePurchaseOfferDetails?.formattedPrice) {
        return product.oneTimePurchaseOfferDetails.formattedPrice;
    }

    // Fallback: try to format from raw price
    if (product.price && product.currency) {
        try {
            const formatter = new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: product.currency,
            });
            return formatter.format(product.price);
        } catch {
            return `${product.currency} ${product.price}`;
        }
    }

    // Last resort fallback
    return product.price?.toString() || "$0.00";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(product: any): SubscriptionProduct {
    const productId = getProductId(product);
    const localizedPrice = getLocalizedPrice(product);

    return {
        id: productId,
        title: product.title || product.name || product.displayName || "Premium",
        description: product.description || "",
        price: localizedPrice,
        priceAmount: product.price || 0,
        currency: product.currency || product.currencyCode || "USD",
        type: mapProductType(productId),
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

    // Keep a ref to availablePurchases to avoid stale closure issues
    const availablePurchasesRef = useRef(availablePurchases);
    useEffect(() => {
        availablePurchasesRef.current = availablePurchases;
    }, [availablePurchases]);

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
                console.error("[IAP] Failed to fetch products:", e);
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
                .filter((p) => {
                    const productId = getProductId(p);
                    return ALL_PRODUCT_SKUS.includes(productId as typeof ALL_PRODUCT_SKUS[number]);
                })
                .map(mapProduct);
            setProducts(mapped);
        }
    }, [iapProducts, subscriptions]);

    // Check available purchases for premium status
    useEffect(() => {
        if (availablePurchases && availablePurchases.length > 0) {
            const hasPremium = availablePurchases.some((p) => {
                const productId = getProductId(p);
                return isPremiumProductId(productId);
            });
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

            // Check if products are loaded
            const allProducts = [...(iapProducts || []), ...(subscriptions || [])];
            const product = allProducts.find((p) => getProductId(p) === productId);

            if (!product) {
                // Products may not be loaded yet, try fetching them first
                console.log("[IAP] Product not found, attempting to refetch products...");
                try {
                    const isSubscription = productId !== PRODUCT_IDS.lifetime;
                    await fetchProducts({
                        skus: isSubscription
                            ? [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly]
                            : [PRODUCT_IDS.lifetime],
                        type: isSubscription ? "subs" : "in-app",
                    });
                    // Give state time to update
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (e) {
                    console.error("[IAP] Failed to refetch products:", e);
                    setError("Unable to load product. Please try again.");
                    return false;
                }
            }

            setIsPurchasing(true);
            setError(null);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
                const isSubscription = productId !== PRODUCT_IDS.lifetime;

                // Re-check products after potential refetch
                const currentProducts = [...(iapProducts || []), ...(subscriptions || [])];
                const currentProduct = currentProducts.find((p) => getProductId(p) === productId);

                if (!currentProduct) {
                    throw new Error("Product not found. Please close and reopen the purchase screen.");
                }

                if (isSubscription) {
                    // Handle subscription with offer tokens for Android
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const subProduct = currentProduct as any;
                    const offers = subProduct.subscriptionOffers
                        ?.filter((o: { offerTokenAndroid?: string }) => o.offerTokenAndroid)
                        .map((o: { offerTokenAndroid: string }) => ({
                            sku: productId,
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
                const errorMessage = e instanceof Error ? e.message : "Purchase failed. Please try again.";
                setError(errorMessage);
                setIsPurchasing(false);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return false;
            }
        },
        [connected, iapProducts, subscriptions, requestPurchase, fetchProducts]
    );

    // Track restore completion via state changes
    const [restorePromiseResolver, setRestorePromiseResolver] = useState<{
        resolve: (hasPurchases: boolean) => void;
    } | null>(null);

    // Effect to handle restore completion when availablePurchases updates
    useEffect(() => {
        if (restorePromiseResolver && availablePurchases !== undefined) {
            // Log all purchase details for debugging
            console.log("[IAP] Available purchases:", JSON.stringify(availablePurchases, null, 2));
            console.log("[IAP] Expected SKUs:", ALL_PRODUCT_SKUS);

            const hasPremium = availablePurchases?.some((p) => {
                const pId = getProductId(p);
                console.log("[IAP] Checking purchase product ID:", pId);
                const isMatch = isPremiumProductId(pId);
                console.log("[IAP] Is match:", isMatch);
                return isMatch;
            }) ?? false;

            console.log("[IAP] Restore check - purchases found:", availablePurchases?.length ?? 0, "hasPremium:", hasPremium);

            restorePromiseResolver.resolve(hasPremium);
            setRestorePromiseResolver(null);
        }
    }, [availablePurchases, restorePromiseResolver]);

    const restore = useCallback(async (): Promise<boolean> => {
        if (!connected) {
            setError("Store not connected. Please check your internet connection.");
            return false;
        }

        setIsRestoring(true);
        setError(null);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            // Create a promise that will resolve when availablePurchases updates
            const purchaseCheckPromise = new Promise<boolean>((resolve) => {
                setRestorePromiseResolver({ resolve });
            });

            // Add a timeout to prevent hanging forever
            const timeoutPromise = new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    console.log("[IAP] Restore timeout - checking ref as fallback");
                    // Fallback to ref check after timeout
                    const currentPurchases = availablePurchasesRef.current;
                    const hasPremium = currentPurchases?.some((p) => {
                        const pId = getProductId(p);
                        return ALL_PRODUCT_SKUS.includes(pId as typeof ALL_PRODUCT_SKUS[number]);
                    }) ?? false;
                    resolve(hasPremium);
                }, 3000);
            });

            // Trigger the fetch
            console.log("[IAP] Calling getAvailablePurchases...");
            await getAvailablePurchases();

            // Wait for either the state update or timeout
            const hasPremium = await Promise.race([purchaseCheckPromise, timeoutPromise]);

            // Clean up resolver if timeout won
            setRestorePromiseResolver(null);

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
            setRestorePromiseResolver(null);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return false;
        }
    }, [connected, getAvailablePurchases]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Dev-only function to toggle premium status for testing
    const devSetPremium = useCallback((premium: boolean) => {
        if (__DEV__) {
            console.log(`[DEV] Setting premium status to: ${premium}`);
            setTier(premium ? "premium" : "free");
            savePremiumStatus(premium);
            Haptics.notificationAsync(
                premium
                    ? Haptics.NotificationFeedbackType.Success
                    : Haptics.NotificationFeedbackType.Warning
            );
        } else {
            console.warn("[DEV] devSetPremium is only available in development mode");
        }
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
        devSetPremium,
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
