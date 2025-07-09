"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "classic"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const stored = localStorage.getItem("whispshare-theme") as Theme
    if (stored && ["light", "dark", "classic"].includes(stored)) {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("whispshare-theme", theme)
    document.documentElement.setAttribute("data-theme", theme)

    // Update document class for theme
    document.documentElement.classList.remove("light", "dark", "classic")
    document.documentElement.classList.add(theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
