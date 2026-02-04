import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {useEffect, useRef} from "react";
import { Platform, View } from "react-native";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { router, usePathname } from "expo-router";
import {
    configureReanimatedLogger,
    ReanimatedLogLevel,
} from "react-native-reanimated";

import { TodoListProvider } from "@/context/TodoListContext";
import { ToastProvider } from "@/context/ToastContext";
import { PomodoroProvider, usePomodoro } from "@/context/PomodoroContext";
import { BulkEditProvider } from "@/context/BulkEditContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { UserProvider } from "@/context/UserContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import ProjectDrawer from "@/components/ProjectDrawer";

configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false,
});

const COLORS = {
    light: {
        background: "#FFF8F0",
        statusBar: "dark",
    },
    dark: {
        background: "#0A0A0A",
        statusBar: "light",
    },
};

function NavigationContent() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { activeTimer, isCheckingTimer, initialNotification, clearInitialNotification } = usePomodoro();
    const pathname = usePathname();
    const hasCheckedInitial = useRef(false);
    const handledNotificationRef = useRef<string | null>(null);

    useEffect(() => {
        if (isCheckingTimer) return;

        // Handle initial notification on cold start
        if (!hasCheckedInitial.current) {
            hasCheckedInitial.current = true;

            if (initialNotification && handledNotificationRef.current !== initialNotification.notificationId) {
                handledNotificationRef.current = initialNotification.notificationId;
                router.replace({
                    pathname: '/(tabs)/zen',
                    params: {
                        taskId: initialNotification.taskId,
                        initialTimerState: initialNotification.initialTimerState,
                        initialSessionsCompleted: String(initialNotification.initialSessionsCompleted),
                    },
                });
                clearInitialNotification();
                return;
            }

            // Resume active timer if no notification
            if (activeTimer) {
                router.replace('/(tabs)/zen');
            }
            return;
        }

        // Handle notifications that come in while app is already running
        if (initialNotification && handledNotificationRef.current !== initialNotification.notificationId) {
            handledNotificationRef.current = initialNotification.notificationId;

            // Don't navigate if already on zen mode - just clear the notification
            const isOnZenMode = pathname === '/zen' || pathname === '/(tabs)/zen';
            if (!isOnZenMode) {
                router.push({
                    pathname: '/(tabs)/zen',
                    params: {
                        taskId: initialNotification.taskId,
                        initialTimerState: initialNotification.initialTimerState,
                        initialSessionsCompleted: String(initialNotification.initialSessionsCompleted),
                    },
                });
            }
            clearInitialNotification();
        }
    }, [isCheckingTimer, initialNotification, activeTimer, clearInitialNotification, pathname]);

    if (isCheckingTimer) {
        return null;
    }

    return (
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <Drawer
                drawerContent={(props) => <ProjectDrawer {...props} />}
                screenOptions={{
                    headerShown: false,
                    drawerStyle: {
                        width: "80%",
                        backgroundColor: isDark ? "#0A0A0A" : "#FFF8F0",
                    },
                    drawerType: "front",
                    swipeEdgeWidth: 50,
                    swipeMinDistance: 10,
                }}
            >
                <Drawer.Screen
                    name="(tabs)"
                    options={{
                        headerShown: false,
                        swipeEnabled: true,
                    }}
                />
            </Drawer>
            <StatusBar style={isDark ? "light" : "dark"} />
        </ThemeProvider>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const theme = isDark ? COLORS.dark : COLORS.light;

    useEffect(() => {
        if (Platform.OS === "android") {
            SystemUI.setBackgroundColorAsync(theme.background);
            NavigationBar.setBackgroundColorAsync(theme.background);
            NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
        }
    }, [isDark, theme]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <UserProvider>
                <SubscriptionProvider>
                    <SettingsProvider>
                        <TodoListProvider>
                            <ToastProvider>
                                <PomodoroProvider>
                                    <BulkEditProvider>
                                        <View
                                            style={{
                                                flex: 1,
                                                backgroundColor: theme.background,
                                            }}
                                        >
                                            <NavigationContent />
                                        </View>
                                    </BulkEditProvider>
                                </PomodoroProvider>
                            </ToastProvider>
                        </TodoListProvider>
                    </SettingsProvider>
                </SubscriptionProvider>
            </UserProvider>
        </GestureHandlerRootView>
    );
}