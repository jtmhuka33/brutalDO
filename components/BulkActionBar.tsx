import React, { useCallback } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    Easing,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

interface BulkActionBarProps {
    selectedCount: number;
    onDelete: () => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    totalCount: number;
}

export default function BulkActionBar({
                                          selectedCount,
                                          onDelete,
                                          onSelectAll,
                                          onDeselectAll,
                                          totalCount,
                                      }: BulkActionBarProps) {
    const deleteScale = useSharedValue(1);
    const moveScale = useSharedValue(1);

    const deleteAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: deleteScale.value }],
    }));

    const moveAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: moveScale.value }],
    }));

    const handleDeletePress = useCallback(async () => {
        if (selectedCount === 0) {
            Alert.alert("No Tasks Selected", "Please select at least one task to delete.");
            return;
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            "Delete Tasks?",
            `Are you sure you want to delete ${selectedCount} task${selectedCount > 1 ? "s" : ""}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: onDelete,
                },
            ]
        );
    }, [selectedCount, onDelete]);

    const handleMovePress = useCallback(async () => {
        if (selectedCount === 0) {
            Alert.alert("No Tasks Selected", "Please select at least one task to move.");
            return;
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(tabs)/pick-project");
    }, [selectedCount]);

    const allSelected = selectedCount === totalCount && totalCount > 0;

    return (
        <Animated.View
            entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
            exiting={FadeOut.duration(150).easing(Easing.in(Easing.quad))}
            className="mb-6 gap-3"
        >
            {/* Selection info */}
            <View className="flex-row items-center justify-between">
                <Text className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-100">
                    {selectedCount} selected
                </Text>
                <Pressable
                    onPress={allSelected ? onDeselectAll : onSelectAll}
                    className="border-3 border-black bg-white px-3 py-2 dark:border-neo-primary dark:bg-neo-dark-surface"
                >
                    <Text className="text-xs font-black uppercase text-black dark:text-white">
                        {allSelected ? "Deselect All" : "Select All"}
                    </Text>
                </Pressable>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-4">
                <AnimatedPressable
                    onPress={handleDeletePress}
                    style={deleteAnimatedStyle}
                    onPressIn={() => {
                        deleteScale.value = withTiming(0.96, TIMING_CONFIG);
                    }}
                    onPressOut={() => {
                        deleteScale.value = withTiming(1, TIMING_CONFIG);
                    }}
                    className="flex-1 flex-row items-center justify-center gap-3 border-5 border-black bg-neo-primary p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark"
                >
                    <Ionicons name="trash-sharp" size={24} color="white" />
                    <Text className="text-base font-black uppercase tracking-tight text-white">
                        Delete
                    </Text>
                </AnimatedPressable>

                <AnimatedPressable
                    onPress={handleMovePress}
                    style={moveAnimatedStyle}
                    onPressIn={() => {
                        moveScale.value = withTiming(0.96, TIMING_CONFIG);
                    }}
                    onPressOut={() => {
                        moveScale.value = withTiming(1, TIMING_CONFIG);
                    }}
                    className="flex-1 flex-row items-center justify-center gap-3 border-5 border-black bg-neo-secondary p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark"
                >
                    <Ionicons name="folder-sharp" size={24} color="black" />
                    <Text className="text-base font-black uppercase tracking-tight text-black">
                        Move
                    </Text>
                </AnimatedPressable>
            </View>
        </Animated.View>
    );
}