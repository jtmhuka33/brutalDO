/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            borderWidth: {
                // AGGRESSIVE borders for that raw, hand-drawn look
                DEFAULT: '4px',
                '3': '3px',
                '4': '4px',
                '5': '5px',
                '6': '6px',
            },
            boxShadow: {
                // DEEP, HARSH shadows - no subtlety here
                brutal: "8px 8px 0px 0px rgba(0,0,0,1)",
                'brutal-sm': "4px 4px 0px 0px rgba(0,0,0,1)",
                'brutal-lg': "12px 12px 0px 0px rgba(0,0,0,1)",
                'brutal-xl': "16px 16px 0px 0px rgba(255,255,255,1)",
                // Dark mode shadows (white) - equally aggressive
                'brutal-dark': "8px 8px 0px 0px rgba(255,255,255,1)",
                'brutal-dark-sm': "4px 4px 0px 0px rgba(255,255,255,1)",
                'brutal-dark-lg': "12px 12px 0px 0px rgba(255,255,255,1)",
            },
            colors: {
                neo: {
                    // Canvas colors
                    bg: "#FFF8F0",
                    dark: "#0A0A0A",
                    // HYPER-saturated, vibrant palette
                    primary: "#FF0055", // Neon Pink
                    secondary: "#00FFF0", // Electric Cyan
                    accent: "#FFFF00", // Pure Yellow
                    purple: "#B000FF", // Electric Purple
                    green: "#00FF41", // Matrix Green
                    orange: "#FF6B00", // Vivid Orange
                    white: "#FFFFFF",
                    black: "#000000",
                }
            }
        },
    },
    plugins: [],
}