export type SubscriptionTier = "free" | "premium";

export type SubscriptionStatus = "idle" | "loading" | "ready" | "error";

export interface SubscriptionProduct {
    id: string;
    title: string;
    description: string;
    price: string;
    priceAmount: number;
    currency: string;
    type: "monthly" | "yearly" | "lifetime";
}

export interface SubscriptionState {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    error: string | null;
    products: SubscriptionProduct[];
    isRestoring: boolean;
    isPurchasing: boolean;
}

export const PRODUCT_IDS = {
    monthly: "com.jtmhuka33.brutaldo.premium.monthly",
    yearly: "com.jtmhuka33.brutaldo.premium.yearly",
    lifetime: "com.jtmhuka33.brutaldo.premium.lifetime",
} as const;

export const ALL_PRODUCT_SKUS = [
    PRODUCT_IDS.monthly,
    PRODUCT_IDS.yearly,
    PRODUCT_IDS.lifetime,
] as const;

export const PREMIUM_FEATURES = [
    {
        icon: "notifications-sharp" as const,
        title: "Multiple Reminders",
        description: "Add up to 10 reminders per task with custom times",
    },
    {
        icon: "repeat-sharp" as const,
        title: "Advanced Recurrence",
        description: "Set custom intervals for daily, weekly, and monthly repeating tasks",
    },
    {
        icon: "timer-sharp" as const,
        title: "Custom Pomodoro",
        description: "Personalize your focus sessions, breaks, and cycles",
    },
] as const;

export const FREE_TIER_LIMITS = {
    maxRemindersPerTask: 1,
    allowedRecurrenceTypes: ["once", "daily", "weekly", "monthly"] as const,
    pomodoroDefaults: {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
    },
} as const;