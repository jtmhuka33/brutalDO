import React, { useCallback, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ZenModeButton() {
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    // Subtle pulsing animation for attention
    useEffect(() => {
        rotation.value = withRepeat(
            withSequence(
                withSpring(-3, { damping: 8, stiffness: 100 }),
                withSpring(3, { damping: 8, stiffness: 100 }),
                withSpring(0, { damping: 8, stiffness: 100 })
            ),
            -1,
            false
        );

        return () => {
            cancelAnimation(rotation);
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${rotation.value}deg` },
            { scale: scale.value },
        ],
    }));

    const handlePressIn = useCallback(() => {
        'worklet';
        scale.value = withSpring(0.85, {
            damping: 12,
            stiffness: 400,
        });
    }, []);

    const handlePressOut = useCallback(() => {
        'worklet';
        scale.value = withSpring(1, {
            damping: 10,
            stiffness: 350,
        });
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