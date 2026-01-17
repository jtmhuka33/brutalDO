import { FREE_TIER_LIMITS } from "@/types/subscription";
import { RecurrenceType } from "@/types/recurrence";

/**
 * Check if user can add multiple reminders (more than 1)
 * Free tier: Only 1 reminder per task
 * Premium: Up to 10 reminders per task
 */
export function canAddMultipleReminders(isPremium: boolean): boolean {
    return isPremium;
}

/**
 * Check if user has reached the reminder limit
 * @param currentCount Current number of reminders on the task
 * @param isPremium Whether user has premium subscription
 * @returns Whether user can add another reminder
 */
export function canAddMoreReminders(currentCount: number, isPremium: boolean): boolean {
    if (isPremium) {
        return currentCount < 10; // Premium limit
    }
    return currentCount < FREE_TIER_LIMITS.maxRemindersPerTask;
}

/**
 * Check if user can use biweekly recurrence pattern
 * Free tier: No biweekly
 * Premium: Biweekly available
 */
export function canUseBiweeklyRecurrence(isPremium: boolean): boolean {
    return isPremium;
}

/**
 * Check if user can select custom recurrence days (specific days of week)
 * Free tier: No custom day selection
 * Premium: Can pick specific days (M-Su)
 */
export function canSelectCustomRecurrenceDays(isPremium: boolean): boolean {
    return isPremium;
}

/**
 * Check if user can set recurrence end dates
 * Free tier: No end dates
 * Premium: Can set when recurrence should stop
 */
export function canSetRecurrenceEndDate(isPremium: boolean): boolean {
    return isPremium;
}

/**
 * Check if user can customize Pomodoro timer settings
 * Free tier: Fixed 25/5/15 settings
 * Premium: Fully customizable
 */
export function canCustomizePomodoro(isPremium: boolean): boolean {
    return isPremium;
}

/**
 * Check if a recurrence type is available for the user's subscription tier
 */
export function isRecurrenceTypeAvailable(
    type: RecurrenceType,
    isPremium: boolean
): boolean {
    if (isPremium) return true;

    // "custom" requires premium because it involves custom day selection
    if (type === "custom") return false;

    // "biweekly" requires premium
    if (type === "biweekly") return false;

    return FREE_TIER_LIMITS.allowedRecurrenceTypes.includes(
        type as typeof FREE_TIER_LIMITS.allowedRecurrenceTypes[number]
    );
}

/**
 * Get the list of premium-only recurrence features
 */
export function getPremiumRecurrenceFeatures(): string[] {
    return [
        "Biweekly repeating tasks",
        "Custom day selection (pick specific days)",
        "Recurrence end dates",
    ];
}

/**
 * Check if task has premium features that would be affected by downgrade
 */
export function taskHasPremiumFeatures(task: {
    reminders?: { id: string }[];
    recurrence?: {
        type: RecurrenceType;
        daysOfWeek?: number[];
        endDate?: string;
    };
}): boolean {
    // Multiple reminders
    if (task.reminders && task.reminders.length > FREE_TIER_LIMITS.maxRemindersPerTask) {
        return true;
    }

    // Premium recurrence features
    if (task.recurrence) {
        if (task.recurrence.type === "biweekly") return true;
        if (task.recurrence.type === "custom") return true;
        if (task.recurrence.daysOfWeek && task.recurrence.daysOfWeek.length > 0) return true;
        if (task.recurrence.endDate) return true;
    }

    return false;
}
