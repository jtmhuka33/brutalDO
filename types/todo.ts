import { RecurrencePattern } from "./recurrence";

export type Priority = "high" | "medium" | "low" | "none";

export interface Subtask {
    id: string;
    text: string;
    completed: boolean;
}

export interface Reminder {
    id: string;
    date: string;
    notificationId?: string;
}

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    colorVariant?: number;
    // Legacy single reminder fields (for migration)
    reminderDate?: string;
    notificationId?: string;
    // New multiple reminders
    reminders?: Reminder[];
    dueDate?: string;
    listId?: string;
    archivedAt?: string;
    recurrence?: RecurrencePattern;
    isRecurring?: boolean;
    parentRecurrenceId?: string;
    recurrenceCount?: number;
    subtasks?: Subtask[];
    priority?: Priority;
}

export type SortType = "DEFAULT" | "ALPHA_ASC" | "ALPHA_DESC" | "DUE_ASC" | "DUE_DESC" | "PRIORITY_ASC" | "PRIORITY_DESC";

export interface SortOption {
    value: SortType;
    label: string;
    icon: string;
}

export const PRIORITY_OPTIONS: {
    value: Priority;
    label: string;
    shortLabel: string;
    icon: string;
    colorClass: string;
    textColorClass: string;
    borderColorClass: string;
}[] = [
    {
        value: "high",
        label: "High Priority",
        shortLabel: "HIGH",
        icon: "flame-sharp",
        colorClass: "bg-neo-primary",
        textColorClass: "text-white",
        borderColorClass: "border-neo-primary",
    },
    {
        value: "medium",
        label: "Medium Priority",
        shortLabel: "MED",
        icon: "alert-circle-sharp",
        colorClass: "bg-neo-orange",
        textColorClass: "text-white",
        borderColorClass: "border-neo-orange",
    },
    {
        value: "low",
        label: "Low Priority",
        shortLabel: "LOW",
        icon: "arrow-down-sharp",
        colorClass: "bg-neo-secondary",
        textColorClass: "text-black",
        borderColorClass: "border-neo-secondary",
    },
    {
        value: "none",
        label: "No Priority",
        shortLabel: "NONE",
        icon: "remove-sharp",
        colorClass: "bg-gray-400 dark:bg-gray-600",
        textColorClass: "text-black dark:text-white",
        borderColorClass: "border-gray-400",
    },
];

export const getPriorityWeight = (priority?: Priority): number => {
    switch (priority) {
        case "high":
            return 0;
        case "medium":
            return 1;
        case "low":
            return 2;
        case "none":
        default:
            return 3;
    }
};

export const getPriorityOption = (priority?: Priority) => {
    return PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[3];
};

/**
 * Get all reminders from a task, including migration from legacy format
 */
export const getReminders = (todo: Todo): Reminder[] => {
    // If new reminders array exists, use it
    if (todo.reminders && todo.reminders.length > 0) {
        return todo.reminders;
    }
    // Migrate from legacy single reminder
    if (todo.reminderDate) {
        return [{
            id: `legacy-${todo.id}`,
            date: todo.reminderDate,
            notificationId: todo.notificationId,
        }];
    }
    return [];
};

/**
 * Check if a task has any active reminders
 */
export const hasReminders = (todo: Todo): boolean => {
    return getReminders(todo).length > 0;
};