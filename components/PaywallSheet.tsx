import React, { useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    ScrollView,
    useColorScheme,
    ActivityIndicator,
    Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
    Easing,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

import { useSubscription } from "@/context/SubscriptionContext";
import { PREMIUM_FEATURES, SubscriptionProduct } from "@/types/subscription";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface PaywallSheetProps {
    visible: boolean;
    onClose: () => void;
    featureContext?: string;
}

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PricingCard({
    product,
    isRecommended,
    isLifetime,
    onPurchase,
    isPurchasing,
}: {
    product: SubscriptionProduct;
    isRecommended?: boolean;
    isLifetime?: boolean;
    onPurchase: () => void;
    isPurchasing: boolean;
}) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        "worklet";
        scale.value = withTiming(0.96, TIMING_CONFIG);
    }, []);

    const handlePressOut = useCallback(() => {
        "worklet";
        scale.value = withTiming(1, TIMING_CONFIG);
    }, []);

    const getLabel = () => {
        switch (product.type) {
            case "monthly":
                return "Monthly";
            case "yearly":
                return "Yearly";
            case "lifetime":
                return "Lifetime";
        }
    };

    const getSavingsText = () => {
        if (product.type === "yearly") return "BEST VALUE";
        if (product.type === "lifetime") return "ONE TIME";
        return null;
    };

    const savingsText = getSavingsText();

    return (
        <AnimatedPressable
            onPress={onPurchase}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={animatedStyle}
            disabled={isPurchasing}
            className={cn(
                "border-5 border-black p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                isLifetime
                    ? "bg-neo-green"
                    : isRecommended
                        ? "bg-neo-accent"
                        : "bg-white dark:bg-neo-dark-surface",
                isRecommended && "-rotate-1",
                isLifetime && "rotate-1"
            )}
        >
            {/* Badge */}
            {savingsText && (
                <View
                    className={cn(
                        "absolute -top-3 right-4 border-3 border-black px-2 py-0.5 dark:border-neo-primary",
                        isLifetime ? "bg-neo-purple" : "bg-neo-primary"
                    )}
                >
                    <Text className="text-xs font-black uppercase text-white">
                        {savingsText}
                    </Text>
                </View>
            )}

            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <Text
                        className={cn(
                            "text-lg font-black uppercase tracking-tight",
                            isLifetime || isRecommended
                                ? "text-black"
                                : "text-black dark:text-white"
                        )}
                    >
                        {getLabel()}
                    </Text>
                    <Text
                        className={cn(
                            "text-2xl font-black",
                            isLifetime || isRecommended
                                ? "text-black"
                                : "text-black dark:text-white"
                        )}
                    >
                        {product.price}
                        {product.type !== "lifetime" && (
                            <Text className="text-sm font-black">
                                /{product.type === "monthly" ? "mo" : "yr"}
                            </Text>
                        )}
                    </Text>
                </View>

                <View
                    className={cn(
                        "h-12 w-12 items-center justify-center border-4 border-black dark:border-neo-primary",
                        isLifetime
                            ? "bg-neo-purple"
                            : isRecommended
                                ? "bg-neo-primary"
                                : "bg-neo-secondary"
                    )}
                >
                    {isPurchasing ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Ionicons
                            name={isLifetime ? "infinite-sharp" : "arrow-forward-sharp"}
                            size={24}
                            color="white"
                        />
                    )}
                </View>
            </View>
        </AnimatedPressable>
    );
}

export default function PaywallSheet({
    visible,
    onClose,
    featureContext,
}: PaywallSheetProps) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const {
        products,
        isPurchasing,
        isRestoring,
        purchase,
        restore,
        error,
        clearError,
    } = useSubscription();

    const handleClose = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        clearError();
        onClose();
    }, [onClose, clearError]);

    const handlePurchase = useCallback(
        async (productId: string) => {
            const success = await purchase(productId);
            if (success) {
                onClose();
            }
        },
        [purchase, onClose]
    );

    const handleRestore = useCallback(async () => {
        const success = await restore();
        if (success) {
            onClose();
        }
    }, [restore, onClose]);

    const handleTerms = useCallback(() => {
        Linking.openURL("https://example.com/terms");
    }, []);

    const handlePrivacy = useCallback(() => {
        Linking.openURL("https://example.com/privacy");
    }, []);

    // Sort products: monthly, yearly, lifetime
    const sortedProducts = [...products].sort((a, b) => {
        const order = { monthly: 0, yearly: 1, lifetime: 2 };
        return order[a.type] - order[b.type];
    });

    const monthlyProduct = sortedProducts.find((p) => p.type === "monthly");
    const yearlyProduct = sortedProducts.find((p) => p.type === "yearly");
    const lifetimeProduct = sortedProducts.find((p) => p.type === "lifetime");

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            {/* Backdrop */}
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                className="flex-1 bg-black/70"
            >
                <Pressable onPress={handleClose} className="flex-1" />
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                entering={SlideInDown.duration(300).easing(Easing.out(Easing.quad))}
                exiting={SlideOutDown.duration(250).easing(Easing.in(Easing.quad))}
                className="absolute bottom-0 left-0 right-0 bg-neo-bg dark:bg-neo-dark border-t-5 border-black dark:border-neo-primary"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
                {/* Header */}
                <View className="flex-row items-center justify-between border-b-5 border-black bg-neo-primary px-4 py-3 dark:border-neo-primary">
                    <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center border-4 border-white bg-white">
                            <Ionicons name="diamond-sharp" size={22} color="#FF0055" />
                        </View>
                        <View>
                            <Text className="text-xl font-black uppercase tracking-tight text-white">
                                Go Premium
                            </Text>
                            {featureContext && (
                                <Text className="text-xs font-black uppercase text-white/70">
                                    Unlock {featureContext}
                                </Text>
                            )}
                        </View>
                    </View>
                    <Pressable
                        onPress={handleClose}
                        className="h-10 w-10 items-center justify-center border-4 border-white bg-white active:bg-gray-100"
                    >
                        <Ionicons name="close-sharp" size={22} color="#FF0055" />
                    </Pressable>
                </View>

                <ScrollView
                    className="max-h-[500px]"
                    contentContainerStyle={{ padding: 16 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Features List */}
                    <Animated.View entering={FadeIn.delay(100).duration(200)} className="mb-6">
                        <Text className="mb-3 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                            Premium Features
                        </Text>
                        <View className="gap-3">
                            {PREMIUM_FEATURES.map((feature, index) => (
                                <View
                                    key={feature.title}
                                    className={cn(
                                        "flex-row items-center gap-3 border-4 border-black bg-white p-3 dark:border-neo-primary dark:bg-neo-dark-surface",
                                        index % 2 === 0 && "-rotate-1",
                                        index % 2 === 1 && "rotate-1"
                                    )}
                                >
                                    <View className="h-10 w-10 items-center justify-center border-3 border-black bg-neo-green dark:border-neo-primary">
                                        <Ionicons name={feature.icon} size={20} color="black" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-black uppercase text-black dark:text-white">
                                            {feature.title}
                                        </Text>
                                        <Text className="text-xs font-bold text-gray-600 dark:text-gray-400">
                                            {feature.description}
                                        </Text>
                                    </View>
                                    <Ionicons name="checkmark-sharp" size={20} color="#00FF41" />
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* Error Message */}
                    {error && (
                        <Animated.View
                            entering={FadeIn.duration(200)}
                            className="mb-4 border-4 border-neo-primary bg-neo-primary/10 p-3"
                        >
                            <Text className="text-center text-sm font-black uppercase text-neo-primary">
                                {error}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Pricing Cards */}
                    <Animated.View entering={FadeIn.delay(200).duration(200)} className="gap-4">
                        <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                            Choose Your Plan
                        </Text>

                        {products.length === 0 ? (
                            <View className="items-center justify-center py-8">
                                <ActivityIndicator
                                    size="large"
                                    color={colorScheme === "dark" ? "#FF0055" : "#000"}
                                />
                                <Text className="mt-3 text-sm font-black uppercase text-gray-500 dark:text-gray-400">
                                    Loading plans...
                                </Text>
                            </View>
                        ) : (
                            <View className="gap-3">
                                {yearlyProduct && (
                                    <PricingCard
                                        product={yearlyProduct}
                                        isRecommended
                                        onPurchase={() => handlePurchase(yearlyProduct.id)}
                                        isPurchasing={isPurchasing}
                                    />
                                )}
                                {monthlyProduct && (
                                    <PricingCard
                                        product={monthlyProduct}
                                        onPurchase={() => handlePurchase(monthlyProduct.id)}
                                        isPurchasing={isPurchasing}
                                    />
                                )}
                                {lifetimeProduct && (
                                    <PricingCard
                                        product={lifetimeProduct}
                                        isLifetime
                                        onPurchase={() => handlePurchase(lifetimeProduct.id)}
                                        isPurchasing={isPurchasing}
                                    />
                                )}
                            </View>
                        )}
                    </Animated.View>

                    {/* Restore & Links */}
                    <Animated.View entering={FadeIn.delay(300).duration(200)} className="mt-6">
                        <Pressable
                            onPress={handleRestore}
                            disabled={isRestoring}
                            className="mb-4 items-center justify-center border-4 border-dashed border-gray-400 bg-transparent p-3 dark:border-neo-primary"
                        >
                            {isRestoring ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colorScheme === "dark" ? "#FF0055" : "#666"}
                                />
                            ) : (
                                <Text className="text-sm font-black uppercase tracking-tight text-gray-500 dark:text-gray-400">
                                    Restore Purchases
                                </Text>
                            )}
                        </Pressable>

                        <View className="flex-row items-center justify-center gap-4">
                            <Pressable onPress={handleTerms}>
                                <Text className="text-xs font-bold text-gray-400 underline dark:text-gray-500">
                                    Terms of Service
                                </Text>
                            </Pressable>
                            <Text className="text-gray-400 dark:text-gray-500">•</Text>
                            <Pressable onPress={handlePrivacy}>
                                <Text className="text-xs font-bold text-gray-400 underline dark:text-gray-500">
                                    Privacy Policy
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
}
