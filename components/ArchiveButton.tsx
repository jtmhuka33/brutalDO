// components/ArchiveButton.tsx
import React, { useCallback } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

interface ArchiveButtonProps {
    count: number;
    onPress: () => void;
}

export default function ArchiveButton({ count, onPress }: ArchiveButtonProps) {
    const colorScheme = useColorScheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        "worklet";
        scale.value = withTiming(0.95, TIMING_CONFIG);
    }, []);

    const handlePressOut = useCallback(() => {
        "worklet";
        scale.value = withTiming(1, TIMING_CONFIG);
    }, []);

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={animatedStyle}
            className="flex-row items-center gap-3 border-5 border-black bg-white p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark"
        >
            <View className="h-10 w-10 items-center justify-center border-4 border-black bg-gray-300 dark:border-neo-primary dark:bg-neo-dark-elevated">
                <Ionicons
                    name="archive-sharp"
                    size={20}
                    color={colorScheme === "dark" ? "#FF0055" : "black"}
                />
            </View>
            <View className="flex-1">
                <Text className="text-base font-black uppercase tracking-tight text-black dark:text-white">
                    Archive
                </Text>
                <Text className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {count} {count === 1 ? "item" : "items"}
                </Text>
            </View>
            <Ionicons
                name="chevron-forward-sharp"
                size={24}
                color={colorScheme === "dark" ? "#FF0055" : "black"}
            />
        </AnimatedPressable>
    );
}