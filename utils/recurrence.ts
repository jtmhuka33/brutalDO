import {DAYS_OF_WEEK, RecurrencePattern} from "@/types/recurrence";
import {Todo} from "@/types/todo";

/**
 * Calculate the next occurrence date based on the recurrence pattern
 */
export function getNextOccurrenceDate(
    currentDate: Date,
    pattern: RecurrencePattern
): Date | null {
    if (pattern.type === "none") return null;

    const next = new Date(currentDate);

    switch (pattern.type) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;

        case "weekdays":
            // Move to next weekday
            do {
                next.setDate(next.getDate() + 1);
            } while (next.getDay() === 0 || next.getDay() === 6);
            break;

        case "weekly":
            return getNextDayOfWeekOccurrence(currentDate, pattern.daysOfWeek, 1);

        case "biweekly":
            return getNextDayOfWeekOccurrence(currentDate, pattern.daysOfWeek, 2);

        case "custom":
            // Custom now means specific days of the week (weekly pattern)
            return getNextDayOfWeekOccurrence(currentDate, pattern.daysOfWeek, 1);

        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;

        case "yearly":
            next.setFullYear(next.getFullYear() + 1);
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
    weekInterval: number
): Date | null {
    if (!daysOfWeek || daysOfWeek.length === 0) {
        // Default to same day next week/biweekly
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
        // Add additional weeks for biweekly (weekInterval - 1 extra weeks)
        const totalDays = daysUntilNextCycle + (7 * (weekInterval - 1));
        next.setDate(next.getDate() + totalDays);
    }

    return next;
}

/**
 * Format recurrence pattern for display
 */
export function formatRecurrencePattern(pattern: RecurrencePattern): string {
    switch (pattern.type) {
        case "none":
            return "Does not repeat";
        case "daily":
            return "Every day";
        case "weekdays":
            return "Weekdays";
        case "weekly":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
                return `Weekly on ${formatDaysOfWeek(pattern.daysOfWeek)}`;
            }
            return "Every week";
        case "biweekly":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
                return `Biweekly on ${formatDaysOfWeek(pattern.daysOfWeek)}`;
            }
            return "Every 2 weeks";
        case "monthly":
            return "Every month";
        case "yearly":
            return "Every year";
        case "custom":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
                return formatDaysOfWeek(pattern.daysOfWeek);
            }
            return "Custom days";
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
    switch (pattern.type) {
        case "none":
            return "ONCE";
        case "daily":
            return "DAILY";
        case "weekdays":
            return "M-F";
        case "weekly":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0 && pattern.daysOfWeek.length < 7) {
                return formatDaysShort(pattern.daysOfWeek);
            }
            return "WEEKLY";
        case "biweekly":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0 && pattern.daysOfWeek.length < 7) {
                return `2W ${formatDaysShort(pattern.daysOfWeek)}`;
            }
            return "2 WEEKS";
        case "monthly":
            return "MONTHLY";
        case "yearly":
            return "YEARLY";
        case "custom":
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
                return formatDaysShort(pattern.daysOfWeek);
            }
            return "CUSTOM";
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
    if (!completedTodo.recurrence || completedTodo.recurrence.type === "none") {
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
 * Check if a recurrence pattern is active (not "none")
 */
export function isRecurrenceActive(pattern?: RecurrencePattern): boolean {
    return !!pattern && pattern.type !== "none";
}