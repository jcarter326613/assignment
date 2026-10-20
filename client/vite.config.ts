import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./test-unit/setup.ts"],
        include: ["test-unit/**/*.test.{ts,tsx}"],
    },
})
