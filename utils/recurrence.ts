import { RecurrencePattern, RecurrenceType } from "@/types/recurrence";
import { Todo } from "@/types/todo";

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
            next.setDate(next.getDate() + 7);
            break;

        case "biweekly":
            next.setDate(next.getDate() + 14);
            break;

        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;

        case "yearly":
            next.setFullYear(next.getFullYear() + 1);
            break;

        case "custom":
            if (pattern.interval && pattern.unit) {
                switch (pattern.unit) {
                    case "days":
                        next.setDate(next.getDate() + pattern.interval);
                        break;
                    case "weeks":
                        next.setDate(next.getDate() + pattern.interval * 7);
                        break;
                    case "months":
                        next.setMonth(next.getMonth() + pattern.interval);
                        break;
                    case "years":
                        next.setFullYear(next.getFullYear() + pattern.interval);
                        break;
                }
            }
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
            return "Every week";
        case "biweekly":
            return "Every 2 weeks";
        case "monthly":
            return "Every month";
        case "yearly":
            return "Every year";
        case "custom":
            if (pattern.interval && pattern.unit) {
                const unitLabel =
                    pattern.interval === 1
                        ? pattern.unit.slice(0, -1) // Remove 's' for singular
                        : pattern.unit;
                return `Every ${pattern.interval} ${unitLabel}`;
            }
            return "Custom";
        default:
            return "Unknown";
    }
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
            return "WEEKLY";
        case "biweekly":
            return "2 WEEKS";
        case "monthly":
            return "MONTHLY";
        case "yearly":
            return "YEARLY";
        case "custom":
            if (pattern.interval && pattern.unit) {
                return `${pattern.interval}${pattern.unit.charAt(0).toUpperCase()}`;
            }
            return "CUSTOM";
        default:
            return "?";
    }
}

/**
 * Create the next recurring todo instance
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

    const newTodo: Todo = {
        id: Date.now().toString(),
        text: completedTodo.text,
        completed: false,
        colorVariant: colorVariant,
        listId: completedTodo.listId,
        dueDate: nextDueDate.toISOString(),
        recurrence: { ...completedTodo.recurrence },
        isRecurring: true,
        parentRecurrenceId: completedTodo.parentRecurrenceId || completedTodo.id,
        recurrenceCount: (completedTodo.recurrenceCount || 0) + 1,
        // Don't copy reminder - user should set new reminder if needed
    };

    return newTodo;
}

/**
 * Check if a recurrence pattern is active (not "none")
 */
export function isRecurrenceActive(pattern?: RecurrencePattern): boolean {
    return !!pattern && pattern.type !== "none";
}