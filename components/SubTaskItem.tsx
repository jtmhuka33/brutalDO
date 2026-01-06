import React, { useCallback } from "react";
import {Text, Pressable,} from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    Layout,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";
import { Subtask } from "@/types/todo";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface SubtaskItemProps {
    subtask: Subtask;
    index: number;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function SubtaskItem({
                                        subtask,
                                        index,
                                        onToggle,
                                        onDelete,
                                    }: SubtaskItemProps) {
    const handleToggle = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(subtask.id);
    }, [onToggle, subtask.id]);

    const handleDelete = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDelete(subtask.id);
    }, [onDelete, subtask.id]);

    return (
        <Animated.View
            entering={FadeIn.delay(index * 30).duration(200)}
            exiting={FadeOut.duration(150)}
            layout={Layout.duration(200).easing(Easing.inOut(Easing.quad))}
            className="flex-row items-center gap-3 py-2"
        >
            <Pressable
                onPress={handleToggle}
                className={cn(
                    "h-7 w-7 items-center justify-center border-4 border-black dark:border-neo-primary",
                    subtask.completed
                        ? "bg-neo-green"
                        : "bg-white dark:bg-neo-dark-surface"
                )}
            >
                {subtask.completed && (
                    <Ionicons name="checkmark-sharp" size={16} color="black" />
                )}
            </Pressable>

            <Text
                className={cn(
                    "flex-1 text-sm font-black uppercase tracking-tight",
                    subtask.completed
                        ? "text-gray-400 line-through dark:text-gray-300"
                        : "text-black dark:text-white"
                )}
                numberOfLines={2}
            >
                {subtask.text}
            </Text>

            <Pressable
                onPress={handleDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="h-7 w-7 items-center justify-center border-3 border-black bg-neo-primary dark:border-neo-primary"
            >
                <Ionicons name="close-sharp" size={14} color="white" />
            </Pressable>
        </Animated.View>
    );
}