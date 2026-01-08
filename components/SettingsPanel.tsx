import React, { useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    ScrollView,
    Alert,
    useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    SlideInRight,
    SlideOutRight,
    FadeIn,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useSettings } from "@/context/SettingsContext";
import { POMODORO_LIMITS } from "@/types/settings";
import NumberStepper from "./NumberStepper";

interface SettingsPanelProps {
    visible: boolean;
    onClose: () => void;
}

export default function SettingsPanel({ visible, onClose }: SettingsPanelProps) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const { settings, updatePomodoroSettings, resetPomodoroSettings } = useSettings();

    const handleClose = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    }, [onClose]);

    const handleResetPomodoro = useCallback(() => {
        Alert.alert(
            "Reset Timer Settings?",
            "This will restore all Pomodoro timer settings to their default values.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        await resetPomodoroSettings();
                    },
                },
            ]
        );
    }, [resetPomodoroSettings]);

    const handleWorkDurationChange = useCallback(
        (value: number) => {
            updatePomodoroSettings({ workDuration: value });
        },
        [updatePomodoroSettings]
    );

    const handleShortBreakChange = useCallback(
        (value: number) => {
            updatePomodoroSettings({ shortBreakDuration: value });
        },
        [updatePomodoroSettings]
    );

    const handleLongBreakChange = useCallback(
        (value: number) => {
            updatePomodoroSettings({ longBreakDuration: value });
        },
        [updatePomodoroSettings]
    );

    const handleSessionsChange = useCallback(
        (value: number) => {
            updatePomodoroSettings({ sessionsBeforeLongBreak: value });
        },
        [updatePomodoroSettings]
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View className="flex-1 flex-row">
                {/* Backdrop */}
                <Pressable
                    onPress={handleClose}
                    className="flex-1 bg-black/60"
                />

                {/* Settings Panel */}
                <Animated.View
                    entering={SlideInRight.duration(300).easing(Easing.out(Easing.quad))}
                    exiting={SlideOutRight.duration(250).easing(Easing.in(Easing.quad))}
                    className="w-[85%] bg-neo-bg dark:bg-neo-dark"
                    style={{ paddingTop: insets.top }}
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between border-b-5 border-black bg-neo-primary px-4 py-4 dark:border-neo-primary">
                        <View className="flex-row items-center gap-3">
                            <Ionicons name="settings-sharp" size={28} color="white" />
                            <Text className="text-2xl font-black uppercase tracking-tight text-white">
                                Settings
                            </Text>
                        </View>
                        <Pressable
                            onPress={handleClose}
                            className="h-11 w-11 items-center justify-center border-4 border-white bg-white"
                        >
                            <Ionicons name="close-sharp" size={24} color="#FF0055" />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{
                            padding: 16,
                            paddingBottom: Math.max(insets.bottom, 24) + 24,
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Pomodoro Timer Section */}
                        <Animated.View entering={FadeIn.delay(100).duration(200)}>
                            <View className="mb-6 flex-row items-center gap-3">
                                <View className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-primary dark:border-neo-primary">
                                    <Ionicons name="timer-sharp" size={20} color="white" />
                                </View>
                                <Text className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
                                    Pomodoro Timer
                                </Text>
                            </View>

                            <View className="gap-6">
                                {/* Work Duration */}
                                <NumberStepper
                                    label="Focus Duration"
                                    value={settings.pomodoro.workDuration}
                                    min={POMODORO_LIMITS.workDuration.min}
                                    max={POMODORO_LIMITS.workDuration.max}
                                    step={POMODORO_LIMITS.workDuration.step}
                                    unit="min"
                                    onChange={handleWorkDurationChange}
                                    colorClass="bg-neo-primary"
                                />

                                {/* Short Break Duration */}
                                <NumberStepper
                                    label="Short Break"
                                    value={settings.pomodoro.shortBreakDuration}
                                    min={POMODORO_LIMITS.shortBreakDuration.min}
                                    max={POMODORO_LIMITS.shortBreakDuration.max}
                                    step={POMODORO_LIMITS.shortBreakDuration.step}
                                    unit="min"
                                    onChange={handleShortBreakChange}
                                    colorClass="bg-neo-green"
                                />

                                {/* Long Break Duration */}
                                <NumberStepper
                                    label="Long Break"
                                    value={settings.pomodoro.longBreakDuration}
                                    min={POMODORO_LIMITS.longBreakDuration.min}
                                    max={POMODORO_LIMITS.longBreakDuration.max}
                                    step={POMODORO_LIMITS.longBreakDuration.step}
                                    unit="min"
                                    onChange={handleLongBreakChange}
                                    colorClass="bg-neo-purple"
                                />

                                {/* Sessions Before Long Break */}
                                <NumberStepper
                                    label="Sessions Before Long Break"
                                    value={settings.pomodoro.sessionsBeforeLongBreak}
                                    min={POMODORO_LIMITS.sessionsBeforeLongBreak.min}
                                    max={POMODORO_LIMITS.sessionsBeforeLongBreak.max}
                                    step={POMODORO_LIMITS.sessionsBeforeLongBreak.step}
                                    unit="sessions"
                                    onChange={handleSessionsChange}
                                    colorClass="bg-neo-orange"
                                />
                            </View>

                            {/* Timer Info */}
                            <View className="mt-6 border-5 border-dashed border-gray-400 bg-white/50 p-4 dark:border-neo-primary dark:bg-neo-dark-surface/50">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Ionicons
                                        name="information-circle-sharp"
                                        size={18}
                                        color={colorScheme === "dark" ? "#FF0055" : "#666"}
                                    />
                                    <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                                        How It Works
                                    </Text>
                                </View>
                                <Text className="text-sm font-bold text-gray-600 dark:text-gray-300 leading-5">
                                    Complete {settings.pomodoro.sessionsBeforeLongBreak} focus sessions of{" "}
                                    {settings.pomodoro.workDuration} min each with {settings.pomodoro.shortBreakDuration} min breaks.
                                    After {settings.pomodoro.sessionsBeforeLongBreak} sessions, take a {settings.pomodoro.longBreakDuration} min long break!
                                </Text>
                            </View>

                            {/* Reset Button */}
                            <Pressable
                                onPress={handleResetPomodoro}
                                className="mt-6 flex-row items-center justify-center gap-3 border-5 border-black bg-gray-300 p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-elevated dark:shadow-brutal-dark"
                            >
                                <Ionicons
                                    name="refresh-sharp"
                                    size={24}
                                    color={colorScheme === "dark" ? "white" : "black"}
                                />
                                <Text className="text-base font-black uppercase tracking-tight text-black dark:text-white">
                                    Reset to Defaults
                                </Text>
                            </Pressable>
                        </Animated.View>

                        {/* Future Settings Placeholder */}
                        <View className="mt-8 border-t-4 border-dashed border-gray-300 pt-8 dark:border-gray-700">
                            <View className="items-center justify-center py-8">
                                <View className="h-16 w-16 items-center justify-center border-4 border-dashed border-gray-400 dark:border-gray-600">
                                    <Ionicons
                                        name="construct-outline"
                                        size={32}
                                        color={colorScheme === "dark" ? "#666" : "#999"}
                                    />
                                </View>
                                <Text className="mt-4 text-center text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-600">
                                    More Settings Coming Soon
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}