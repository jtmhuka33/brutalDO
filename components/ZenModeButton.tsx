// components/ZenModeButton.tsx
import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

export default function ZenModeButton() {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = useCallback(() => {
        'worklet';
        scale.value = withTiming(0.9, TIMING_CONFIG);
        opacity.value = withTiming(0.8, TIMING_CONFIG);
    }, []);

    const handlePressOut = useCallback(() => {
        'worklet';
        scale.value = withTiming(1, TIMING_CONFIG);
        opacity.value = withTiming(1, TIMING_CONFIG);
    }, []);

    const handlePress = useCallback(() => {
        router.push("/(tabs)/zen");
    }, []);

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={animatedStyle}
            className="relative"
        >
            {/* Sale sticker style outer circle */}
            <View className="h-20 w-20 items-center justify-center rounded-full border-5 border-black bg-neo-primary shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm">
                {/* Inner content */}
                <View className="items-center justify-center">
                    <Ionicons name="leaf-sharp" size={28} color="white" />
                    <Text className="mt-1 text-[10px] font-black uppercase tracking-tighter text-white">
                        ZEN
                    </Text>
                </View>
            </View>

            {/* Decorative notches for sale sticker look */}
            <View className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-3 border-black bg-neo-primary dark:border-neo-primary" />
            <View className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-3 border-black bg-neo-primary dark:border-neo-primary" />
            <View className="absolute left-1/2 -top-1 h-3 w-3 -translate-x-1/2 rotate-45 border-3 border-black bg-neo-primary dark:border-neo-primary" />
            <View className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-3 border-black bg-neo-primary dark:border-neo-primary" />
        </AnimatedPressable>
    );
}