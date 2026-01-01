import React, {useCallback} from "react";
import {View, Text, Pressable, ScrollView, Alert} from "react-native";
import {router} from "expo-router";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {StatusBar} from "expo-status-bar";
import Animated, {FadeIn, FadeInDown} from "react-native-reanimated";
import {Ionicons} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {twMerge} from "tailwind-merge";
import {clsx} from "clsx";

import {useTodoList} from "@/context/TodoListContext";
import {useBulkEdit} from "@/context/BulkEditContext";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const LIST_COLORS = [
    "bg-neo-accent",
    "bg-neo-secondary",
    "bg-neo-primary",
    "bg-neo-purple",
    "bg-neo-green",
    "bg-neo-orange",
];

export default function PickProjectScreen() {
    const insets = useSafeAreaInsets();
    const {lists, selectedListId} = useTodoList();
    const {selectedIds, moveTasks, exitBulkMode} = useBulkEdit();

    const handleBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }, []);

    const handleSelectProject = useCallback(
        async (targetListId: string) => {
            if (targetListId === selectedListId) {
                Alert.alert("Same Project", "Tasks are already in this project.");
                return;
            }

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const targetList = lists.find((l) => l.id === targetListId);
            const count = selectedIds.size;

            Alert.alert(
                "Move Tasks?",
                `Move ${count} task${count > 1 ? "s" : ""} to "${targetList?.name.toUpperCase() || "Inbox"}"?`,
                [
                    {text: "Cancel", style: "cancel"},
                    {
                        text: "Move",
                        onPress: async () => {
                            await moveTasks(targetListId);
                            exitBulkMode();
                            router.replace("/(tabs)");
                        },
                    },
                ]
            );
        },
        [selectedListId, lists, selectedIds, moveTasks, exitBulkMode]
    );

    // Filter out current list
    const availableLists = lists.filter((l) => l.id !== selectedListId);

    return (
        <View
            className="flex-1 bg-neo-bg dark:bg-neo-dark"
            style={{paddingTop: insets.top + 20}}
        >
            <StatusBar style="auto"/>

            {/* Header */}
            <Animated.View
                entering={FadeIn.duration(300)}
                className="mb-6 px-6"
            >
                <View className="flex-row items-center gap-4">
                    <Pressable
                        onPress={handleBack}
                        className="h-12 w-12 items-center justify-center border-5 border-black bg-white shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="arrow-back-sharp" size={24} color="#FF0055"/>
                    </Pressable>
                    <View className="flex-1">
                        <Text className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">
                            Move Tasks
                        </Text>
                        <Text className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {selectedIds.size} task{selectedIds.size > 1 ? "s" : ""} selected
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* Helper text */}
            <View
                className="mb-6 mx-6 border-5 border-dashed border-gray-400 bg-neo-accent/30 p-4 dark:border-neo-primary dark:bg-neo-primary/10">
                <Text
                    className="text-center text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    Choose your target project
                </Text>
            </View>

            {/* Project List */}
            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{paddingBottom: Math.max(insets.bottom, 24) + 24}}
                showsVerticalScrollIndicator={false}
            >
                {availableLists.length === 0 ? (
                    <View className="items-center justify-center py-16">
                        <View
                            className="h-20 w-20 items-center justify-center border-5 border-dashed border-gray-400 dark:border-neo-primary">
                            <Ionicons name="folder-open-outline" size={40} color="#999"/>
                        </View>
                        <Text
                            className="mt-4 text-center text-lg font-black uppercase text-gray-500 dark:text-gray-400">
                            No other projects
                        </Text>
                        <Text
                            className="mt-2 text-center text-sm font-black uppercase text-gray-400 dark:text-gray-500">
                            Create more projects first
                        </Text>
                    </View>
                ) : (
                    availableLists.map((list, index) => {
                        const colorClass = LIST_COLORS[list.colorVariant ?? index % LIST_COLORS.length];

                        return (
                            <Animated.View
                                key={list.id}
                                entering={FadeInDown.delay(index * 50).duration(300)}
                            >
                                <Pressable
                                    onPress={() => handleSelectProject(list.id)}
                                    className={cn(
                                        "mb-4 flex-row items-center gap-4 border-5 border-black p-5 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                        colorClass,
                                        index % 2 === 0 && "-rotate-1",
                                        index % 2 === 1 && "rotate-1"
                                    )}
                                >
                                    <View
                                        className="h-12 w-12 items-center justify-center border-4 border-black bg-white dark:border-neo-primary dark:bg-neo-dark">
                                        <Ionicons
                                            name={"folder-sharp"}
                                            size={24}
                                            color="#FF0055"
                                        />
                                    </View>
                                    <Text
                                        className="flex-1 text-xl font-black uppercase tracking-tight text-black dark:text-black"
                                        numberOfLines={1}
                                    >
                                        {list.name}
                                    </Text>
                                    <Ionicons name="arrow-forward-sharp" size={24} color="black"/>
                                </Pressable>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    )}