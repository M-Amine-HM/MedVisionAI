/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                medical: {
                    bg: "#F8FAFC",
                    primary: "#2563EB",
                    text: "#0F172A",
                    muted: "#64748B",
                    border: "#E2E8F0",
                },
            },
            borderRadius: {
                xl: "0.75rem",
            },
            boxShadow: {
                card: "0 6px 18px rgba(15, 23, 42, 0.06)",
            },
        },
    },
    plugins: [],
};
