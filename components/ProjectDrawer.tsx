import React, { useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    Pressable,
    TextInput,
    ScrollView,
    Alert,
    useColorScheme,
    Keyboard,
} from "react-native";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    FadeIn,
    FadeInDown,
} from "react-native-reanimated";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";

import { useTodoList } from "@/context/TodoListContext";
import { DEFAULT_LIST_ID } from "@/types/todoList";
import SettingsPanel from "./SettingsPanel";

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

export default function ProjectDrawer(props: DrawerContentComponentProps) {
    const { navigation } = props;
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const { lists, selectedListId, setSelectedListId, addList, deleteList } = useTodoList();
    const scrollViewRef = useRef<ScrollView>(null);
    const inputRef = useRef<TextInput>(null);

    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [showSettings, setShowSettings] = useState(false);

    const handleSelectList = useCallback(async (listId: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedListId(listId);
        navigation.closeDrawer();
    }, [setSelectedListId, navigation]);

    const handleAddList = useCallback(async () => {
        if (!newListName.trim()) return;
        Keyboard.dismiss();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await addList(newListName);
        setNewListName("");
        setIsAddingNew(false);
    }, [newListName, addList]);

    const handleStartAddingNew = useCallback(() => {
        setIsAddingNew(true);
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
            inputRef.current?.focus();
        }, 100);
    }, []);

    const handleCancelAddNew = useCallback(() => {
        Keyboard.dismiss();
        setIsAddingNew(false);
        setNewListName("");
    }, []);

    const handleDeleteList = useCallback((listId: string, listName: string) => {
        if (listId === DEFAULT_LIST_ID) return;

        Alert.alert(
            "Delete List?",
            `Are you sure you want to delete "${listName}"? Tasks will be moved to Inbox.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        await deleteList(listId);
                    },
                },
            ]
        );
    }, [deleteList]);

    const handleInputFocus = useCallback(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, []);

    const handleOpenSettings = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowSettings(true);
    }, []);

    const handleCloseSettings = useCallback(() => {
        setShowSettings(false);
    }, []);

    return (
        <View
            className="flex-1 bg-neo-bg dark:bg-neo-dark"
            style={{ paddingTop: insets.top + 20 }}
        >
            {/* Header */}
            <Animated.View
                entering={FadeIn.duration(300)}
                className="mb-8 px-6"
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="h-4 w-4 rotate-45 border-4 border-black bg-neo-primary dark:border-neo-primary" />
                        <Text className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white">
                            Projects
                        </Text>
                    </View>
                    {/* Settings Button */}
                    <Pressable
                        onPress={handleOpenSettings}
                        className="h-12 w-12 items-center justify-center border-5 border-black bg-white shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons
                            name="settings-sharp"
                            size={24}
                            color="#FF0055"
                        />
                    </Pressable>
                </View>
                <Text className="mt-2 text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-200">
                    Swipe to close
                </Text>
            </Animated.View>

            {/* Lists */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {lists.map((list, index) => {
                    const isSelected = selectedListId === list.id;
                    const colorClass = LIST_COLORS[list.colorVariant ?? index % LIST_COLORS.length];
                    const isDefault = list.id === DEFAULT_LIST_ID;

                    return (
                        <Animated.View
                            key={list.id}
                            entering={FadeInDown.delay(index * 50).duration(300)}
                        >
                            <Pressable
                                onPress={() => handleSelectList(list.id)}
                                onLongPress={() => !isDefault && handleDeleteList(list.id, list.name)}
                                delayLongPress={500}
                                className={cn(
                                    "mb-4 flex-row items-center justify-between border-5 border-black p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                    isSelected ? colorClass : "bg-white dark:bg-neo-dark-surface",
                                    index % 2 === 0 && "-rotate-1",
                                    index % 2 === 1 && "rotate-1"
                                )}
                            >
                                <View className="flex-1 flex-row items-center gap-3">
                                    <View
                                        className={cn(
                                            "h-8 w-8 items-center justify-center border-4 border-black dark:border-neo-primary",
                                            isSelected ? "bg-white dark:bg-neo-dark" : colorClass
                                        )}
                                    >
                                        {isDefault ? (
                                            <Ionicons
                                                name="file-tray-sharp"
                                                size={16}
                                                color={isSelected ? "#FF0055" : "black"}
                                            />
                                        ) : (
                                            <Ionicons
                                                name="folder-sharp"
                                                size={16}
                                                color={isSelected ? "#FF0055" : "black"}
                                            />
                                        )}
                                    </View>
                                    <Text
                                        className={cn(
                                            "flex-1 text-lg font-black uppercase tracking-tight",
                                            isSelected
                                                ? "text-black dark:text-black"
                                                : "text-black dark:text-white"
                                        )}
                                        numberOfLines={1}
                                    >
                                        {list.name}
                                    </Text>
                                </View>

                                {isSelected && (
                                    <View className="h-6 w-6 items-center justify-center border-3 border-black bg-white dark:border-neo-primary dark:bg-neo-dark">
                                        <Ionicons name="checkmark-sharp" size={14} color="#FF0055" />
                                    </View>
                                )}
                            </Pressable>
                        </Animated.View>
                    );
                })}

                {/* Add New List */}
                {isAddingNew ? (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        className="mb-4 border-5 border-dashed border-black bg-white p-4 dark:border-neo-primary dark:bg-neo-dark-surface"
                    >
                        <TextInput
                            ref={inputRef}
                            value={newListName}
                            onChangeText={setNewListName}
                            placeholder="LIST NAME..."
                            placeholderTextColor={colorScheme === "dark" ? "#888" : "#999"}
                            className="mb-4 border-4 border-black bg-neo-bg p-3 text-base font-black uppercase text-black dark:border-neo-primary dark:bg-neo-dark dark:text-white"
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleAddList}
                            onFocus={handleInputFocus}
                        />
                        <View className="flex-row gap-3">
                            <Pressable
                                onPress={handleAddList}
                                className="flex-1 items-center justify-center border-4 border-black bg-neo-green p-3 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                            >
                                <Text className="text-sm font-black uppercase text-black">
                                    Create
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleCancelAddNew}
                                className="items-center justify-center border-4 border-black bg-gray-300 p-3 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-elevated dark:shadow-brutal-dark-sm"
                            >
                                <Ionicons name="close-sharp" size={20} color={colorScheme === "dark" ? "white" : "black"} />
                            </Pressable>
                        </View>
                    </Animated.View>
                ) : (
                    <Pressable
                        onPress={handleStartAddingNew}
                        className="mb-4 flex-row items-center justify-center gap-3 border-5 border-dashed border-gray-400 bg-transparent p-4 active:bg-gray-100 dark:border-neo-primary dark:active:bg-neo-dark-surface"
                    >
                        <Ionicons
                            name="add-sharp"
                            size={24}
                            color={colorScheme === "dark" ? "#FF0055" : "#666"}
                        />
                        <Text className="text-base font-black uppercase tracking-tight text-gray-500 dark:text-gray-100">
                            New Project
                        </Text>
                    </Pressable>
                )}
            </ScrollView>

            {/* Footer hint */}
            <View
                className="border-t-5 border-black bg-neo-accent px-6 py-4 dark:border-neo-primary dark:bg-neo-primary"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
                <Text className="text-center text-xs font-black uppercase tracking-widest text-black dark:text-white">
                    Long press to delete
                </Text>
            </View>

            {/* Settings Panel */}
            <SettingsPanel
                visible={showSettings}
                onClose={handleCloseSettings}
            />
        </View>
    );
}