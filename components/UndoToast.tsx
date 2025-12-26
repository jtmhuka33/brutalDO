import React, { useCallback, useEffect } from "react";
import { View, Text, Pressable, useColorScheme } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    runOnJS,
    Easing,
    interpolate,
    Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

import { useToast } from "@/context/ToastContext";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const TIMING_CONFIG = {
    duration: 250,
    easing: Easing.out(Easing.quad),
};

const TIMING_CONFIG_FAST = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

interface UndoToastProps {
    onUndo: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function UndoToast({ onUndo }: UndoToastProps) {
    const { toast, hideToast, undoDelete } = useToast();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();

    const translateY = useSharedValue(100);
    const opacity = useSharedValue(0);
    const undoScale = useSharedValue(1);
    const progressWidth = useSharedValue(100);

    useEffect(() => {
        if (toast.visible) {
            translateY.value = withTiming(0, TIMING_CONFIG);
            opacity.value = withTiming(1, TIMING_CONFIG);
            // Animate progress bar from 100% to 0% over 5 seconds
            progressWidth.value = 100;
            progressWidth.value = withTiming(0, {
                duration: 5000,
                easing: Easing.linear,
            });
        } else {
            translateY.value = withTiming(100, TIMING_CONFIG);
            opacity.value = withTiming(0, TIMING_CONFIG);
        }
    }, [toast.visible]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const undoButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: undoScale.value }],
    }));

    const handleUndo = useCallback(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        undoScale.value = withSequence(
            withTiming(0.9, TIMING_CONFIG_FAST),
            withTiming(1, TIMING_CONFIG_FAST)
        );
        const deletedTodo = undoDelete();
        if (deletedTodo) {
            onUndo();
        }
    }, [undoDelete, onUndo]);

    const handleDismiss = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        hideToast();
    }, [hideToast]);

    const handleUndoPressIn = useCallback(() => {
        "worklet";
        undoScale.value = withTiming(0.95, TIMING_CONFIG_FAST);
    }, []);

    const handleUndoPressOut = useCallback(() => {
        "worklet";
        undoScale.value = withTiming(1, TIMING_CONFIG_FAST);
    }, []);

    if (!toast.visible) return null;

    // Truncate message if too long
    const displayMessage = toast.message.length > 30
        ? toast.message.substring(0, 27) + "..."
        : toast.message;

    return (
        <Animated.View
            style={[
                containerStyle,
                {
                    position: "absolute",
                    bottom: Math.max(insets.bottom, 16) + 16,
                    left: 16,
                    right: 16,
                    zIndex: 9999,
                },
            ]}
            pointerEvents="box-none"
        >
            <View className="overflow-hidden border-5 border-black bg-neo-dark shadow-brutal-lg dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-lg">
                {/* Progress Bar */}
                <View className="h-1 w-full bg-gray-700">
                    <Animated.View
                        style={progressStyle}
                        className="h-full bg-neo-primary"
                    />
                </View>

                {/* Content */}
                <View className="flex-row items-center justify-between p-4">
                    {/* Icon and Message */}
                    <View className="flex-1 flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center border-4 border-neo-primary bg-neo-primary">
                            <Ionicons name="trash-sharp" size={20} color="white" />
                        </View>
                        <Text
                            className="flex-1 text-sm font-black uppercase tracking-tight text-white"
                            numberOfLines={1}
                        >
                            {displayMessage}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View className="flex-row items-center gap-3">
                        {/* Undo Button */}
                        <AnimatedPressable
                            onPress={handleUndo}
                            onPressIn={handleUndoPressIn}
                            onPressOut={handleUndoPressOut}
                            style={undoButtonStyle}
                            className="items-center justify-center border-4 border-neo-green bg-neo-green px-4 py-2 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                        >
                            <Text className="text-sm font-black uppercase tracking-tight text-black">
                                UNDO
                            </Text>
                        </AnimatedPressable>

                        {/* Dismiss Button */}
                        <Pressable
                            onPress={handleDismiss}
                            className="h-10 w-10 items-center justify-center border-4 border-gray-600 bg-gray-700 active:bg-gray-600"
                        >
                            <Ionicons name="close-sharp" size={18} color="white" />
                        </Pressable>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}