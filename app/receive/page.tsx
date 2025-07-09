"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Upload, LogOut, User, MapPin, ArrowLeft } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { AIChatbot } from "@/components/ai-chatbot"
import { FileReceiver } from "@/components/file-receiver"
import { supabase } from "@/lib/supabase"
import { signOut } from "@/lib/auth"
import { getCurrentLocation } from "@/lib/location"

export default function ReceivePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    // Get user location
    const getLocation = async () => {
      try {
        const location = await getCurrentLocation()
        setUserLocation({ lat: location.latitude, lng: location.longitude })
      } catch (error) {
        console.error("Error getting location:", error)
      }
    }

    getLocation()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">WhispShare</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userLocation && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                Location Active
              </Badge>
            )}
            <ThemeSwitcher />
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{user.user_metadata?.full_name || user.email}</span>
                </div>
                <Button onClick={handleSignOut} variant="ghost" size="sm">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => router.push("/login")}>Sign In</Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Receive Files</h1>
          <p className="text-muted-foreground">
            Enter a file code to download files shared with you. Files must be within 100km of your location.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <FileReceiver />
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline" onClick={() => router.push("/upload")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files Instead
          </Button>
        </div>
      </div>

      <AIChatbot />
    </div>
  )
}
