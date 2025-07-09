"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Shield, MapPin, Clock, Eye, LogIn, ArrowRight, LogOut, User, Upload, Download } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { supabase } from "@/lib/supabase"
import { signOut, getUserProfile } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        // A 401/Session-missing error just means “not signed in” – treat it as guest
        if (userError && userError.message?.includes("Auth session missing")) {
          console.log("No active session – continuing as guest")
          setUser({ id: "guest", email: "guest@whispshare.com" })
          return
        }

        if (userError) {
          // Any other error is unexpected
          console.error("Unexpected auth error:", userError)
          setUser({ id: "guest", email: "guest@whispshare.com" })
          return
        }

        if (currentUser) {
          console.log("User found on main page:", currentUser.id, currentUser.email)
          setUser(currentUser)

          // Fetch user profile
          try {
            const userProfile = await getUserProfile(currentUser.id)
            if (userProfile) {
              console.log("Profile loaded on main page:", userProfile)
              setProfile(userProfile)
            }
          } catch (profileError) {
            console.error("Error fetching profile:", profileError)
          }
        } else {
          // Not signed in → guest mode
          setUser({ id: "guest", email: "guest@whispshare.com" })
        }
      } catch (error) {
        console.error("Fatal error checking user:", error)
        setUser({ id: "guest", email: "guest@whispshare.com" })
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change on main page:", event, session?.user?.id)

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)

        // Fetch profile for newly signed in user
        try {
          const userProfile = await getUserProfile(session.user.id)
          if (userProfile) {
            setProfile(userProfile)
          }
        } catch (error) {
          console.error("Error fetching profile after sign-in:", error)
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })
      setUser(null)
      setProfile(null)
    } catch (error: any) {
      console.error("Sign out error:", error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0]
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url

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
            {user ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={displayName} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2 bg-transparent">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button onClick={() => router.push("/login")} className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 float-animation">
              <Shield className="h-20 w-20 mx-auto mb-6 opacity-90" />
            </div>
            {user ? (
              <>
                <h1 className="text-5xl md:text-6xl font-bold mb-6">Welcome back, {displayName}! 👋</h1>
                <p className="text-xl md:text-2xl mb-4 opacity-90">Ready to share files securely?</p>
                <p className="text-lg mb-8 opacity-80 max-w-2xl mx-auto">
                  Your secure, location-based file sharing platform is ready to use.
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
              </>
            ) : (
              <>
                <h1 className="text-5xl md:text-6xl font-bold mb-6">WhispShare</h1>
                <p className="text-xl md:text-2xl mb-4 opacity-90">Ephemeral • Location-Based • Secure</p>
                <p className="text-lg mb-8 opacity-80 max-w-2xl mx-auto">
                  Share files that disappear like whispers in the wind. Location-aware, privacy-first, and beautifully
                  ephemeral.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
                    onClick={() => router.push("/login")}
                  >
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3 bg-transparent"
                    onClick={() => router.push("/upload")}
                  >
                    Try as Guest
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* User Status Section */}
      {user && (
        <section className="py-12 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="text-center p-6">
                  <CardContent className="pt-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Account Active</h3>
                    <p className="text-sm text-muted-foreground">Signed in as {displayName}</p>
                    <Badge variant="secondary" className="mt-2">
                      {profile?.provider || "email"}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="text-center p-6">
                  <CardContent className="pt-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Secure Profile</h3>
                    <p className="text-sm text-muted-foreground">Your data is encrypted and protected</p>
                  </CardContent>
                </Card>

                <Card className="text-center p-6">
                  <CardContent className="pt-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MapPin className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Location Ready</h3>
                    <p className="text-sm text-muted-foreground">Share files within 100km radius</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Why WhispShare?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Designed for those who value privacy, security, and the beauty of impermanence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Ephemeral by Design</h3>
                <p className="text-muted-foreground">Files vanish automatically - no digital footprint left behind</p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Location-Aware Sharing</h3>
                <p className="text-muted-foreground">
                  Smart proximity detection for secure local file transfers within 100km
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Whisper-Level Security</h3>
                <p className="text-muted-foreground">Military-grade encryption with zero-knowledge architecture</p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
                <p className="text-muted-foreground">No tracking, no logs, no permanent storage - just pure privacy</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <Shield className="h-16 w-16 mx-auto mb-6 text-blue-600" />
            <h2 className="text-3xl font-bold mb-4">WhispShare</h2>
            <p className="text-lg text-muted-foreground mb-8">Ephemeral, Location-Based File Sharing</p>
            {!user && (
              <Button onClick={() => router.push("/login")} size="lg" className="gap-2">
                <LogIn className="h-5 w-5" />
                Get Started Today
              </Button>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Built with love for privacy • Files vanish like whispers in the wind
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
