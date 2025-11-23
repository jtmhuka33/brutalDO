/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            borderWidth: {
                // Thicker default borders for that marker-drawn look
                DEFAULT: '3px',
                '4': '4px',
                '5': '5px',
            },
            boxShadow: {
                // Deeper, harder shadows
                brutal: "5px 5px 0px 0px rgba(0,0,0,1)",
                'brutal-sm': "3px 3px 0px 0px rgba(0,0,0,1)",
                'brutal-lg': "8px 8px 0px 0px rgba(0,0,0,1)",
                // Dark mode shadows (white)
                'brutal-dark': "5px 5px 0px 0px rgba(255,255,255,1)",
                'brutal-dark-sm': "3px 3px 0px 0px rgba(255,255,255,1)",
            },
            colors: {
                neo: {
                    // Cleaner canvas to let colors pop
                    bg: "#FFF8F0",
                    dark: "#050505",
                    // Hyper-saturated palette
                    primary: "#FF2E63", // Hot Pink/Red
                    secondary: "#08D9D6", // Cyan
                    accent: "#FAFF00", // Electric Yellow
                    purple: "#9D4EDD", // Electric Purple
                    white: "#FFFFFF",
                }
            }
        },
    },
    plugins: [],
}