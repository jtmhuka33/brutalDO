export type RecurrenceType = "once" | "daily" | "weekly" | "monthly";

export interface RecurrencePattern {
    type: RecurrenceType;
    interval?: number;      // Every N days/weeks/months (default 1)
    daysOfWeek?: number[];  // 0=Sunday, 1=Monday, ..., 6=Saturday (for weekly)
    startDate?: string;     // Optional start date for the recurrence
    endDate?: string;       // Optional end date for the recurrence
}

export const RECURRENCE_OPTIONS: {
    type: RecurrenceType;
    label: string;
    shortLabel: string;
    icon: string;
    showDayPicker?: boolean;
}[] = [
    { type: "once", label: "Does not repeat", shortLabel: "ONCE", icon: "close-circle-sharp" },
    { type: "daily", label: "Every day", shortLabel: "DAILY", icon: "sunny-sharp" },
    { type: "weekly", label: "Every week", shortLabel: "WEEKLY", icon: "calendar-sharp", showDayPicker: true },
    { type: "monthly", label: "Every month", shortLabel: "MONTHLY", icon: "moon-sharp" },
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