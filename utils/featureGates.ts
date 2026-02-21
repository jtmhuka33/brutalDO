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
 * Check if user can set custom recurrence intervals (> 1)
 * Free tier: interval is always 1
 * Premium: Can set interval to any value
 */
export function canSetRecurrenceInterval(isPremium: boolean): boolean {
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
 * All 4 types are available to all users
 */
export function isRecurrenceTypeAvailable(
    type: RecurrenceType,
    _isPremium: boolean
): boolean {
    return FREE_TIER_LIMITS.allowedRecurrenceTypes.includes(
        type as typeof FREE_TIER_LIMITS.allowedRecurrenceTypes[number]
    );
}

/**
 * Get the list of premium-only recurrence features
 */
export function getPremiumRecurrenceFeatures(): string[] {
    return [
        "Custom repeat intervals (every 2 days, every 3 weeks, etc.)",
    ];
}

/**
 * Check if task has premium features that would be affected by downgrade
 */
export function taskHasPremiumFeatures(task: {
    reminders?: { id: string }[];
    recurrence?: {
        type: RecurrenceType;
        interval?: number;
        daysOfWeek?: number[];
        endDate?: string;
    };
}): boolean {
    // Multiple reminders
    if (task.reminders && task.reminders.length > FREE_TIER_LIMITS.maxRemindersPerTask) {
        return true;
    }

    // Premium recurrence feature: interval > 1
    if (task.recurrence && task.recurrence.interval && task.recurrence.interval > 1) {
        return true;
    }

    return false;
}