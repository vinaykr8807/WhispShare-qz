"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Shield, Upload, Share, BarChart3, LogOut, User, MapPin, ArrowLeft } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { AIChatbot } from "@/components/ai-chatbot"
import { FileUpload } from "@/components/file-upload"
import { supabase } from "@/lib/supabase"
import { signOut } from "@/lib/auth"
import { getCurrentLocation } from "@/lib/location"

export default function UploadPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
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

  const handleUploadComplete = () => {
    setRefreshKey((prev) => prev + 1)
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
          <h1 className="text-3xl font-bold mb-2">Upload Files</h1>
          <p className="text-muted-foreground">
            Share files securely with people nearby. Files automatically expire after 24 hours.
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="share" className="gap-2" onClick={() => router.push("/receive")}>
              <Share className="h-4 w-4" />
              Receive
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  AI-Powered Secure Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload onUploadComplete={handleUploadComplete} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  AI-Enhanced Security Features:
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Real-time virus scanning with machine learning</li>
                  <li>• Smart content analysis and auto-tagging</li>
                  <li>• AI-optimized expiry time suggestions</li>
                  <li>• Advanced threat detection and behavioral analysis</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Location Status</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userLocation ? "Active" : "Inactive"}</div>
                  <p className="text-xs text-muted-foreground">
                    {userLocation
                      ? "Location sharing enabled for nearby file discovery"
                      : "Enable location to see nearby files"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Security Level</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">High</div>
                  <p className="text-xs text-muted-foreground">End-to-end encryption active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">File Expiry</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24h</div>
                  <p className="text-xs text-muted-foreground">Automatic file deletion</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>How WhispShare Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold">Upload Files</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload files with AI-powered security scanning and location tagging
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm font-semibold text-purple-600">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold">Location-Based Sharing</h3>
                    <p className="text-sm text-muted-foreground">
                      Files are only visible to users within 5km of your location
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-sm font-semibold text-green-600">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold">Automatic Expiry</h3>
                    <p className="text-sm text-muted-foreground">
                      Files automatically disappear after 24 hours for maximum privacy
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AIChatbot />
    </div>
  )
}
