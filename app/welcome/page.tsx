"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Upload, Download, ArrowRight, User } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { supabase } from "@/lib/supabase"
import { createUserProfile } from "@/lib/auth"

export default function WelcomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUser(user)
        // Create or update user profile
        try {
          await createUserProfile(user)
        } catch (error) {
          console.error("Error creating user profile:", error)
        }
      } else {
        router.push("/login")
      }
      setLoading(false)
    }

    checkUser()
  }, [router])

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
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">WhispShare</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {user && (
              <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                <User className="h-4 w-4" />
                <span className="text-sm">{user.user_metadata?.full_name || user.email}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <section className="gradient-hero text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 float-animation">
              <Shield className="h-16 w-16 mx-auto mb-6 opacity-90" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to WhispShare, {user?.user_metadata?.full_name?.split(" ")[0] || "Friend"}!
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Your secure, location-based file sharing platform is ready. Share files that disappear like whispers in
              the wind.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
                onClick={() => router.push("/upload")}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Files
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3 bg-transparent"
                onClick={() => router.push("/receive")}
              >
                <Download className="mr-2 h-5 w-5" />
                Receive Files
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How WhispShare Works</h2>
            <p className="text-xl text-muted-foreground">Simple, secure, and ephemeral file sharing in three steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Upload & Share</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your file and get a unique 8-character code. Files are encrypted and stored temporarily.
                </p>
                <Button variant="outline" onClick={() => router.push("/upload")}>
                  Start Uploading <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Share Code</h3>
                <p className="text-muted-foreground mb-4">
                  Share the unique code with someone within 5km of your location. No accounts required for receivers.
                </p>
                <Button variant="outline" disabled>
                  Share Code
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Download & Vanish</h3>
                <p className="text-muted-foreground mb-4">
                  Receiver enters the code to download. File disappears forever after download or 24 hours.
                </p>
                <Button variant="outline" onClick={() => router.push("/receive")}>
                  Receive Files <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Security</h2>
            <p className="text-xl text-muted-foreground">Your privacy and security are our top priorities</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">End-to-End Encryption</h3>
              <p className="text-sm text-muted-foreground">Military-grade encryption protects your files</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-purple-600">100km</span>
              </div>
              <h3 className="font-semibold mb-2">Proximity-Based</h3>
              <p className="text-sm text-muted-foreground">Files only accessible within 100km radius</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-green-600">24h</span>
              </div>
              <h3 className="font-semibold mb-2">Auto-Expiry</h3>
              <p className="text-sm text-muted-foreground">Files automatically deleted after 24 hours</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-orange-600">50MB</span>
              </div>
              <h3 className="font-semibold mb-2">File Size Limit</h3>
              <p className="text-sm text-muted-foreground">Maximum file size for optimal security</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
