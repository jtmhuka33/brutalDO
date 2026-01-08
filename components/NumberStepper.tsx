import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface NumberStepperProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    label: string;
    unit?: string;
    onChange: (value: number) => void;
    colorClass?: string;
}

const TIMING_CONFIG = {
    duration: 100,
    easing: Easing.out(Easing.quad),
};

export default function NumberStepper({
                                          value,
                                          min,
                                          max,
                                          step = 1,
                                          label,
                                          unit = "min",
                                          onChange,
                                          colorClass = "bg-neo-accent",
                                      }: NumberStepperProps) {
    const decrementScale = useSharedValue(1);
    const incrementScale = useSharedValue(1);
    const valueScale = useSharedValue(1);

    const decrementAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: decrementScale.value }],
    }));

    const incrementAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: incrementScale.value }],
    }));

    const valueAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: valueScale.value }],
    }));

    const handleDecrement = useCallback(async () => {
        if (value <= min) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        decrementScale.value = withTiming(0.9, TIMING_CONFIG, () => {
            decrementScale.value = withTiming(1, TIMING_CONFIG);
        });
        valueScale.value = withTiming(1.1, TIMING_CONFIG, () => {
            valueScale.value = withTiming(1, TIMING_CONFIG);
        });
        onChange(Math.max(min, value - step));
    }, [value, min, step, onChange]);

    const handleIncrement = useCallback(async () => {
        if (value >= max) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        incrementScale.value = withTiming(0.9, TIMING_CONFIG, () => {
            incrementScale.value = withTiming(1, TIMING_CONFIG);
        });
        valueScale.value = withTiming(1.1, TIMING_CONFIG, () => {
            valueScale.value = withTiming(1, TIMING_CONFIG);
        });
        onChange(Math.min(max, value + step));
    }, [value, max, step, onChange]);

    const canDecrement = value > min;
    const canIncrement = value < max;

    return (
        <View className="gap-2">
            <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                {label}
            </Text>
            <View className="flex-row items-center gap-3">
                {/* Decrement Button */}
                <Animated.View style={decrementAnimatedStyle}>
                    <Pressable
                        onPress={handleDecrement}
                        disabled={!canDecrement}
                        className={cn(
                            "h-14 w-14 items-center justify-center border-5 border-black shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                            canDecrement
                                ? "bg-white dark:bg-neo-dark-surface"
                                : "bg-gray-300 dark:bg-neo-dark-elevated opacity-50"
                        )}
                    >
                        <Ionicons
                            name="remove-sharp"
                            size={28}
                            color={canDecrement ? "#FF0055" : "#999"}
                        />
                    </Pressable>
                </Animated.View>

                {/* Value Display */}
                <Animated.View
                    style={valueAnimatedStyle}
                    className={cn(
                        "flex-1 items-center justify-center border-5 border-black py-4 shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm",
                        colorClass
                    )}
                >
                    <Text className="text-3xl font-black tabular-nums text-black">
                        {value}
                    </Text>
                    <Text className="text-xs font-black uppercase tracking-widest text-black/70">
                        {unit}
                    </Text>
                </Animated.View>

                {/* Increment Button */}
                <Animated.View style={incrementAnimatedStyle}>
                    <Pressable
                        onPress={handleIncrement}
                        disabled={!canIncrement}
                        className={cn(
                            "h-14 w-14 items-center justify-center border-5 border-black shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                            canIncrement
                                ? "bg-white dark:bg-neo-dark-surface"
                                : "bg-gray-300 dark:bg-neo-dark-elevated opacity-50"
                        )}
                    >
                        <Ionicons
                            name="add-sharp"
                            size={28}
                            color={canIncrement ? "#FF0055" : "#999"}
                        />
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}