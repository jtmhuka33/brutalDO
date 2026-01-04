export type RecurrenceType =
    | "none"
    | "daily"
    | "weekdays"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "yearly"
    | "custom";

export interface RecurrencePattern {
    type: RecurrenceType;
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday (for weekly, biweekly, custom)
    endDate?: string; // Optional end date for the recurrence
}

export const RECURRENCE_OPTIONS: {
    type: RecurrenceType;
    label: string;
    shortLabel: string;
    icon: string;
    showDayPicker?: boolean;
}[] = [
    { type: "none", label: "Does not repeat", shortLabel: "ONCE", icon: "close-circle-sharp" },
    { type: "daily", label: "Every day", shortLabel: "DAILY", icon: "sunny-sharp" },
    { type: "weekdays", label: "Weekdays (Mon-Fri)", shortLabel: "WEEKDAYS", icon: "briefcase-sharp" },
    { type: "weekly", label: "Every week", shortLabel: "WEEKLY", icon: "calendar-sharp", showDayPicker: true },
    { type: "biweekly", label: "Every 2 weeks", shortLabel: "BI-WEEKLY", icon: "calendar-number-sharp", showDayPicker: true },
    { type: "monthly", label: "Every month", shortLabel: "MONTHLY", icon: "moon-sharp" },
    { type: "yearly", label: "Every year", shortLabel: "YEARLY", icon: "planet-sharp" },
    { type: "custom", label: "Custom days...", shortLabel: "CUSTOM", icon: "settings-sharp", showDayPicker: true },
];

export const DAYS_OF_WEEK: {
    value: number;
    label: string;
    shortLabel: string;
}[] = [
    { value: 0, label: "Sunday", shortLabel: "S" },
    { value: 1, label: "Monday", shortLabel: "M" },
    { value: 2, label: "Tuesday", shortLabel: "T" },
    { value: 3, label: "Wednesday", shortLabel: "W" },
    { value: 4, label: "Thursday", shortLabel: "T" },
    { value: 5, label: "Friday", shortLabel: "F" },
    { value: 6, label: "Saturday", shortLabel: "S" },
];