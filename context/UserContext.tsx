import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const USER_ID_STORAGE_KEY = "@neo_brutal_user_id_v1";

interface UserContextType {
    userId: string | null;
    isLoading: boolean;
    regenerateUserId: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Generate a unique user ID using crypto
 */
async function generateUserId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(8);
    const hexString = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hexString.toUpperCase();
}

export function UserProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrCreateUserId = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(USER_ID_STORAGE_KEY);
            if (stored) {
                setUserId(stored);
            } else {
                // Generate new user ID
                const newId = await generateUserId();
                await AsyncStorage.setItem(USER_ID_STORAGE_KEY, newId);
                setUserId(newId);
            }
        } catch (e) {
            console.error("Failed to load/create user ID:", e);
            // Fallback to a simple random ID
            const fallbackId = Math.random().toString(36).substring(2, 10).toUpperCase();
            setUserId(fallbackId);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrCreateUserId();
    }, [loadOrCreateUserId]);

    const regenerateUserId = useCallback(async () => {
        try {
            const newId = await generateUserId();
            await AsyncStorage.setItem(USER_ID_STORAGE_KEY, newId);
            setUserId(newId);
        } catch (e) {
            console.error("Failed to regenerate user ID:", e);
        }
    }, []);

    return (
        <UserContext.Provider
            value={{
                userId,
                isLoading,
                regenerateUserId,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}