import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppSettings, PomodoroSettings, DEFAULT_SETTINGS } from "@/types/settings";

const SETTINGS_STORAGE_KEY = "@neo_brutal_settings_v1";

interface SettingsContextType {
    settings: AppSettings;
    isLoading: boolean;
    updatePomodoroSettings: (updates: Partial<PomodoroSettings>) => Promise<void>;
    resetPomodoroSettings: () => Promise<void>;
    resetAllSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    const loadSettings = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const parsed: AppSettings = JSON.parse(stored);
                // Merge with defaults to handle new settings added in updates
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    pomodoro: {
                        ...DEFAULT_SETTINGS.pomodoro,
                        ...parsed.pomodoro,
                    },
                });
            }
        } catch (e) {
            console.error("Failed to load settings:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveSettings = useCallback(async (newSettings: AppSettings) => {
        try {
            await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        } catch (e) {
            console.error("Failed to save settings:", e);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updatePomodoroSettings = useCallback(async (updates: Partial<PomodoroSettings>) => {
        const newSettings: AppSettings = {
            ...settings,
            pomodoro: {
                ...settings.pomodoro,
                ...updates,
            },
        };
        setSettings(newSettings);
        await saveSettings(newSettings);
    }, [settings, saveSettings]);

    const resetPomodoroSettings = useCallback(async () => {
        const newSettings: AppSettings = {
            ...settings,
            pomodoro: DEFAULT_SETTINGS.pomodoro,
        };
        setSettings(newSettings);
        await saveSettings(newSettings);
    }, [settings, saveSettings]);

    const resetAllSettings = useCallback(async () => {
        setSettings(DEFAULT_SETTINGS);
        await saveSettings(DEFAULT_SETTINGS);
    }, [saveSettings]);
    return (
        <SettingsContext.Provider
            value={{
                settings,
                isLoading,
                updatePomodoroSettings,
                resetPomodoroSettings,
                resetAllSettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}