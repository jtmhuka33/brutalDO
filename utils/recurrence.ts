import {DAYS_OF_WEEK, RecurrencePattern} from "@/types/recurrence";
import {Todo} from "@/types/todo";

/**
 * Calculate the next occurrence date based on the recurrence pattern
 */
export function getNextOccurrenceDate(
    currentDate: Date,
    pattern: RecurrencePattern
): Date | null {
    if (pattern.type === "once") return null;

    const interval = pattern.interval || 1;
    const next = new Date(currentDate);

    switch (pattern.type) {
        case "daily":
            next.setDate(next.getDate() + interval);
            break;

        case "weekly":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
                return getNextDayOfWeekOccurrence(currentDate, pattern.daysOfWeek, interval, pattern.endDate);
            }
            next.setDate(next.getDate() + (7 * interval));
            break;

        case "monthly":
            next.setMonth(next.getMonth() + interval);
            break;
    }

    // Check if the next date exceeds the end date
    if (pattern.endDate) {
        const endDate = new Date(pattern.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (next > endDate) {
            return null;
        }
    }

    return next;
}

/**
 * Get the next occurrence based on selected days of the week
 */
function getNextDayOfWeekOccurrence(
    currentDate: Date,
    daysOfWeek: number[] | undefined,
    weekInterval: number,
    endDateStr?: string
): Date | null {
    if (!daysOfWeek || daysOfWeek.length === 0) {
        // Default to same day next week(s)
        const next = new Date(currentDate);
        next.setDate(next.getDate() + (7 * weekInterval));
        return next;
    }

    const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
    const currentDayOfWeek = currentDate.getDay();
    const next = new Date(currentDate);

    // Find the next day in the pattern
    let foundNextDay = false;
    for (const day of sortedDays) {
        if (day > currentDayOfWeek) {
            // Found a day later this week
            const daysToAdd = day - currentDayOfWeek;
            next.setDate(next.getDate() + daysToAdd);
            foundNextDay = true;
            break;
        }
    }

    if (!foundNextDay) {
        // Wrap to the first day of the pattern in the next cycle
        const firstDay = sortedDays[0];
        const daysUntilNextCycle = (7 - currentDayOfWeek) + firstDay;
        // Add additional weeks for interval > 1 (e.g., every 2 weeks)
        const totalDays = daysUntilNextCycle + (7 * (weekInterval - 1));
        next.setDate(next.getDate() + totalDays);
    }

    // Check end date
    if (endDateStr) {
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
        if (next > endDate) {
            return null;
        }
    }

    return next;
}

/**
 * Format recurrence pattern for display
 */
export function formatRecurrencePattern(pattern: RecurrencePattern): string {
    const interval = pattern.interval || 1;

    switch (pattern.type) {
        case "once":
            return "Does not repeat";
        case "daily":
            return interval === 1 ? "Every day" : `Every ${interval} days`;
        case "weekly":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
                const daysText = formatDaysOfWeek(pattern.daysOfWeek);
                if (interval === 1) {
                    return `Weekly on ${daysText}`;
                }
                return `Every ${interval} weeks on ${daysText}`;
            }
            return interval === 1 ? "Every week" : `Every ${interval} weeks`;
        case "monthly":
            return interval === 1 ? "Every month" : `Every ${interval} months`;
        default:
            return "Unknown";
    }
}

/**
 * Format days of week array to readable string
 */
function formatDaysOfWeek(days: number[]): string {
    if (days.length === 0) return "";

    const sortedDays = [...days].sort((a, b) => a - b);
    const dayNames = sortedDays.map(d => DAYS_OF_WEEK[d].label.substring(0, 3));

    if (dayNames.length === 7) return "Every day";
    if (dayNames.length === 1) return dayNames[0];
    if (dayNames.length === 2) return dayNames.join(" & ");

    return dayNames.slice(0, -1).join(", ") + " & " + dayNames[dayNames.length - 1];
}

/**
 * Get short label for recurrence pattern
 */
export function getRecurrenceShortLabel(pattern: RecurrencePattern): string {
    const interval = pattern.interval || 1;

    switch (pattern.type) {
        case "once":
            return "ONCE";
        case "daily":
            return interval === 1 ? "DAILY" : `${interval}D`;
        case "weekly":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0 && pattern.daysOfWeek.length < 7) {
                const daysShort = formatDaysShort(pattern.daysOfWeek);
                return interval === 1 ? daysShort : `${interval}W ${daysShort}`;
            }
            return interval === 1 ? "WEEKLY" : `${interval}W`;
        case "monthly":
            return interval === 1 ? "MONTHLY" : `${interval}MO`;
        default:
            return "?";
    }
}

/**
 * Format days to short form (e.g., "MWF")
 */
function formatDaysShort(days: number[]): string {
    const sortedDays = [...days].sort((a, b) => a - b);
    // Use unique identifiers to distinguish S (Sun) from S (Sat)
    const shortLabels = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
    return sortedDays.map(d => shortLabels[d]).join("");
}

/**
 * Create the next recurring instance
 */
export function createNextRecurringTodo(
    completedTodo: Todo,
    colorVariant: number
): Todo | null {
    if (!completedTodo.recurrence || completedTodo.recurrence.type === "once") {
        return null;
    }

    // Calculate the base date for the next occurrence
    const baseDate = completedTodo.dueDate
        ? new Date(completedTodo.dueDate)
        : new Date();

    const nextDueDate = getNextOccurrenceDate(baseDate, completedTodo.recurrence);

    if (!nextDueDate) {
        return null; // Recurrence has ended
    }

    // Set the due date to end of day
    nextDueDate.setHours(23, 59, 59, 999);

    // Check end date
    if (completedTodo.recurrence.endDate) {
        const endDate = new Date(completedTodo.recurrence.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (nextDueDate > endDate) {
            return null;
        }
    }

    return {
        id: Date.now().toString(),
        text: completedTodo.text,
        completed: false,
        colorVariant: colorVariant,
        listId: completedTodo.listId,
        dueDate: nextDueDate.toISOString(),
        recurrence: {...completedTodo.recurrence},
        isRecurring: true,
        parentRecurrenceId: completedTodo.parentRecurrenceId || completedTodo.id,
        recurrenceCount: (completedTodo.recurrenceCount || 0) + 1,
        priority: completedTodo.priority,
        reminders: [],
    };
}

/**
 * Check if a recurrence pattern is active (not "once")
 */
export function isRecurrenceActive(pattern?: RecurrencePattern): boolean {
    return !!pattern && pattern.type !== "once";
}

/**
 * Migrate old recurrence patterns to the new format.
 * Call this when loading todos from storage to handle legacy data.
 */
export function migrateRecurrencePattern(pattern: any): RecurrencePattern | undefined {
    if (!pattern || !pattern.type) return undefined;

    switch (pattern.type) {
        case "none":
            return { type: "once" };
        case "once":
            return { type: "once" };
        case "weekdays":
            return {
                type: "weekly",
                interval: 1,
                daysOfWeek: [1, 2, 3, 4, 5],
                startDate: pattern.startDate,
                endDate: pattern.endDate,
            };
        case "biweekly":
            return {
                type: "weekly",
                interval: 2,
                daysOfWeek: pattern.daysOfWeek,
                startDate: pattern.startDate,
                endDate: pattern.endDate,
            };
        case "yearly":
            return undefined; // Drop silently
        case "custom":
            return {
                type: "weekly",
                interval: 1,
                daysOfWeek: pattern.daysOfWeek,
                startDate: pattern.startDate,
                endDate: pattern.endDate,
            };
        case "daily":
            return {
                type: "daily",
                interval: pattern.interval || 1,
                startDate: pattern.startDate,
                endDate: pattern.endDate,
            };
        case "weekly":
            return {
                type: "weekly",
                interval: pattern.interval || 1,
                daysOfWeek: pattern.daysOfWeek,
                startDate: pattern.startDate,
                endDate: pattern.endDate,
            };
        case "monthly":
            return {
                type: "monthly",
                interval: pattern.interval || 1,
                startDate: pattern.startDate,
                endDate: pattern.endDate,
            };
        default:
            return pattern;
    }
}