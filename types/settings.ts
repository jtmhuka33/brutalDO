export interface PomodoroSettings {
    workDuration: number; // in minutes
    shortBreakDuration: number; // in minutes
    longBreakDuration: number; // in minutes
    sessionsBeforeLongBreak: number;
}

export interface AppSettings {
    pomodoro: PomodoroSettings;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
};

export const DEFAULT_SETTINGS: AppSettings = {
    pomodoro: DEFAULT_POMODORO_SETTINGS,
};

export const POMODORO_LIMITS = {
    workDuration: { min: 1, max: 90, step: 1 },
    shortBreakDuration: { min: 1, max: 30, step: 1 },
    longBreakDuration: { min: 1, max: 60, step: 1 },
    sessionsBeforeLongBreak: { min: 1, max: 10, step: 1 },
};