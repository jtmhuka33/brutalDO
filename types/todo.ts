import { RecurrencePattern } from "./recurrence";

export type Priority = "high" | "medium" | "low" | "none";

export interface Subtask {
    id: string;
    text: string;
    completed: boolean;
}

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    colorVariant?: number;
    reminderDate?: string;
    notificationId?: string;
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