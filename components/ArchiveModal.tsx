// components/ArchiveModal.tsx
import React, { useCallback, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    FlatList,
    Alert,
    useColorScheme,
} from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";

import { Todo } from "@/types/todo";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface ArchiveModalProps {
    visible: boolean;
    onClose: () => void;
    archivedTodos: Todo[];
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
}

const CARD_COLORS = [
    "bg-gray-300 dark:bg-neo-dark-elevated",
    "bg-gray-300 dark:bg-neo-dark-elevated",
    "bg-gray-300 dark:bg-neo-dark-elevated",
    "bg-gray-300 dark:bg-neo-dark-elevated",
    "bg-gray-300 dark:bg-neo-dark-elevated",
    "bg-gray-300 dark:bg-neo-dark-elevated",
];

interface ArchivedItemProps {
    item: Todo;
    index: number;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
}

function ArchivedItem({ item, index, onRestore, onDelete }: ArchivedItemProps) {
    const colorScheme = useColorScheme();

    const handleRestore = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRestore(item.id);
    }, [onRestore, item.id]);

    const handleDelete = useCallback(() => {
        Alert.alert(
            "Delete Forever?",
            `This will permanently delete "${item.text}".`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Warning
                        );
                        onDelete(item.id);
                    },
                },
            ]
        );
    }, [onDelete, item]);

    const formatArchivedDate = (dateString?: string) => {
        if (!dateString) return "Unknown";
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday =
            date.toDateString() ===
            new Date(now.getTime() - 86400000).toDateString();

        if (isToday) return "TODAY";
        if (isYesterday) return "YESTERDAY";

        return date
            .toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            })
            .toUpperCase();
    };

    return (
        <Animated.View
            entering={FadeIn.delay(index * 30).duration(200)}
            exiting={FadeOut.duration(150)}
            className={cn(
                "mb-4 border-5 border-black p-4 shadow-brutal-sm dark:border-gray-600 dark:shadow-brutal-dark-sm",
                CARD_COLORS[item.colorVariant ?? index % CARD_COLORS.length],
                index % 2 === 0 && "-rotate-1",
                index % 2 === 1 && "rotate-1"
            )}
        >
            <View className="flex-row items-center gap-3">
                {/* Checkmark icon */}
                <View className="h-10 w-10 items-center justify-center border-4 border-black bg-black dark:border-gray-600 dark:bg-neo-primary">
                    <Ionicons name="checkmark-sharp" size={20} color="white" />
                </View>

                {/* Text content */}
                <View className="flex-1">
                    <Text
                        className="text-base font-black uppercase tracking-tight text-black line-through opacity-60 dark:text-gray-300"
                        numberOfLines={2}
                    >
                        {item.text}
                    </Text>
                    <Text className="mt-1 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-500">
                        Archived {formatArchivedDate(item.archivedAt)}
                    </Text>
                </View>

                {/* Action buttons */}
                <View className="flex-row gap-2">
                    <Pressable
                        onPress={handleRestore}
                        className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-green shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="refresh-sharp" size={18} color="black" />
                    </Pressable>
                    <Pressable
                        onPress={handleDelete}
                        className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-primary shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="trash-sharp" size={18} color="white" />
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}

export default function ArchiveModal({
                                         visible,
                                         onClose,
                                         archivedTodos,
                                         onRestore,
                                         onDelete,
                                         onClearAll,
                                     }: ArchiveModalProps) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();

    const handleClearAll = useCallback(() => {
        if (archivedTodos.length === 0) return;

        Alert.alert(
            "Clear Archive?",
            `This will permanently delete ${archivedTodos.length} ${
                archivedTodos.length === 1 ? "item" : "items"
            }.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        await Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Warning
                        );
                        onClearAll();
                    },
                },
            ]
        );
    }, [archivedTodos.length, onClearAll]);

    const renderItem = useCallback(
        ({ item, index }: { item: Todo; index: number }) => (
            <ArchivedItem
                item={item}
                index={index}
                onRestore={onRestore}
                onDelete={onDelete}
            />
        ),
        [onRestore, onDelete]
    );

    const keyExtractor = useCallback((item: Todo) => item.id, []);

    // Sort archived items by archivedAt date (most recent first)
    const sortedArchivedTodos = useMemo(() => {
        return [...archivedTodos].sort((a, b) => {
            const dateA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
            const dateB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [archivedTodos]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/60 justify-end"
            >
                <Animated.View
                    entering={SlideInDown.duration(300).easing(Easing.out(Easing.quad))}
                    exiting={SlideOutDown.duration(250).easing(Easing.in(Easing.quad))}
                    style={{ maxHeight: "85%" }}
                >
                    <Pressable onPress={() => {}}>
                        <View className="bg-neo-bg dark:bg-neo-dark border-t-5 border-black dark:border-neo-primary">
                            {/* Header */}
                            <View
                                className="flex-row items-center justify-between border-b-5 border-black bg-gray-300 px-6 dark:border-neo-primary dark:bg-neo-dark-elevated"
                                style={{ paddingTop: 16, paddingBottom: 16 }}
                            >
                                <View className="flex-row items-center gap-3">
                                    <Ionicons
                                        name="archive-sharp"
                                        size={28}
                                        color={colorScheme === "dark" ? "#FF0055" : "black"}
                                    />
                                    <Text className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
                                        Archive
                                    </Text>
                                </View>
                                <View className="flex-row items-center gap-3">
                                    {archivedTodos.length > 0 && (
                                        <Pressable
                                            onPress={handleClearAll}
                                            className="h-11 items-center justify-center border-4 border-black bg-neo-primary px-4 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                                        >
                                            <Text className="text-xs font-black uppercase text-white">
                                                Clear All
                                            </Text>
                                        </Pressable>
                                    )}
                                    <Pressable
                                        onPress={onClose}
                                        className="h-11 w-11 items-center justify-center border-4 border-black bg-white dark:border-neo-primary dark:bg-neo-dark-surface"
                                    >
                                        <Ionicons
                                            name="close-sharp"
                                            size={24}
                                            color={colorScheme === "dark" ? "#FF0055" : "black"}
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Content */}
                            <FlatList
                                data={sortedArchivedTodos}
                                keyExtractor={keyExtractor}
                                renderItem={renderItem}
                                contentContainerStyle={{
                                    padding: 16,
                                    paddingBottom: Math.max(insets.bottom, 24) + 16,
                                }}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <View className="items-center justify-center py-16">
                                        <View className="h-20 w-20 items-center justify-center border-5 border-dashed border-gray-400 dark:border-neo-primary">
                                            <Ionicons
                                                name="archive-outline"
                                                size={40}
                                                color={colorScheme === "dark" ? "#666" : "#999"}
                                            />
                                        </View>
                                        <Text className="mt-4 text-center text-lg font-black uppercase text-gray-500 dark:text-gray-400">
                                            Archive Empty
                                        </Text>
                                        <Text className="mt-2 text-center text-sm font-black uppercase text-gray-400 dark:text-gray-500">
                                            Completed tasks appear here
                                        </Text>
                                    </View>
                                }
                            />
                        </View>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}