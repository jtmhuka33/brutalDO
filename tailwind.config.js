/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            boxShadow: {
                // Hard offset shadow, no blur
                brutal: "4px 4px 0px 0px rgba(0,0,0,1)",
                'brutal-dark': "4px 4px 0px 0px rgba(255,255,255,1)",
            },
            colors: {
                // Neo-brutal palette
                neo: {
                    bg: "#E0E7F1",
                    dark: "#1a1a1a",
                    primary: "#FF6B6B", // Red/Pink
                    secondary: "#4ECDC4", // Teal
                    accent: "#FFE66D", // Yellow
                }
            }
        },
    },
    plugins: [],
}