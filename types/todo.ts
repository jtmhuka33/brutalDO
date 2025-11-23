export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    colorVariant?: number;
    reminderDate?: string; 
    notificationId?: string;
}

export type FilterType = "ALL" | "TODO" | "DONE";