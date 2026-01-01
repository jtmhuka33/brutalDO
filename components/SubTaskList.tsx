import React, { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, useColorScheme } from "react-native";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import SubtaskItem from "./SubTaskItem";
import { Subtask } from "@/types/todo";

interface SubtaskListProps {
    subtasks: Subtask[];
    onAddSubtask: (text: string) => void;
    onToggleSubtask: (subtaskId: string) => void;
    onDeleteSubtask: (subtaskId: string) => void;
}

export default function SubtaskList({
                                        subtasks,
                                        onAddSubtask,
                                        onToggleSubtask,
                                        onDeleteSubtask,
                                    }: SubtaskListProps) {
    const [newSubtaskText, setNewSubtaskText] = useState("");
    const colorScheme = useColorScheme();

    const handleAddSubtask = useCallback(async () => {
        if (!newSubtaskText.trim()) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAddSubtask(newSubtaskText.trim().toUpperCase());
        setNewSubtaskText("");
    }, [newSubtaskText, onAddSubtask]);

    const completedCount = subtasks.filter((s) => s.completed).length;
    const totalCount = subtasks.length;

    return (
        <Animated.View
            entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
            className="mt-4 border-t-4 border-dashed border-black/30 pt-4 dark:border-white/20"
        >
            {/* Header */}
            <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                    Subtasks
                </Text>
                {totalCount > 0 && (
                    <View className="flex-row items-center gap-1 border-2 border-black bg-white px-2 py-0.5 dark:border-neo-primary dark:bg-neo-dark-surface">
                        <Text className="text-xs font-black text-black dark:text-white">
                            {completedCount}/{totalCount}
                        </Text>
                    </View>
                )}
            </View>

            {/* Subtask Items */}
            {subtasks.map((subtask, index) => (
                <SubtaskItem
                    key={subtask.id}
                    subtask={subtask}
                    index={index}
                    onToggle={onToggleSubtask}
                    onDelete={onDeleteSubtask}
                />
            ))}

            {/* Add Subtask Input */}
            <View className="mt-3 flex-row gap-2">
                <TextInput
                    value={newSubtaskText}
                    onChangeText={setNewSubtaskText}
                    placeholder="ADD SUBTASK..."
                    placeholderTextColor={colorScheme === "dark" ? "#666" : "#999"}
                    className="flex-1 border-4 border-black bg-white p-3 text-sm font-black uppercase text-black dark:border-neo-primary dark:bg-neo-dark-surface dark:text-white"
                    returnKeyType="done"
                    onSubmitEditing={handleAddSubtask}
                />
                <Pressable
                    onPress={handleAddSubtask}
                    className="items-center justify-center border-4 border-black bg-neo-green px-4 active:bg-neo-green/80 dark:border-neo-primary"
                >
                    <Ionicons name="add-sharp" size={20} color="black" />
                </Pressable>
            </View>
        </Animated.View>
    );
}