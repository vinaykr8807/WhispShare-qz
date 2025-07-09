"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Lock, MapPin, Zap, AlertCircle, Mail, CheckCircle, Loader2 } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { supabase } from "@/lib/supabase"
import { signIn, signUp } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [activeTab, setActiveTab] = useState("signin")
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    // Check for error in URL params
    const urlError = searchParams.get("error")
    if (urlError) {
      switch (urlError) {
        case "auth_failed":
          setError("Authentication failed. Please try again.")
          break
        case "callback_failed":
          setError("Sign-in process was interrupted. Please try again.")
          break
        default:
          setError("Authentication failed. Please try again.")
      }
    }

    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError && !userError.message?.includes("Auth session missing")) {
          console.error("Error getting user:", userError)
          return
        }

        if (currentUser) {
          console.log("User already logged in, redirecting to main page")
          router.push("/")
        }
      } catch (error) {
        console.error("Error checking user:", error)
      }
    }

    checkUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session?.user?.id)

      if (event === "SIGNED_IN" && session?.user) {
        console.log("User signed in, redirecting to main page")

        toast({
          title: "Welcome!",
          description: `Welcome, ${session.user.user_metadata?.full_name || session.user.email}!`,
        })

        // Redirect to main page (home page)
        router.push("/")
      }
    })

    return () => subscription.unsubscribe()
  }, [router, toast, searchParams])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      const { data } = await signIn(email, password)

      if (data?.user) {
        setSuccess("Sign-in successful! Redirecting to main page...")

        toast({
          title: "Welcome back!",
          description: `Successfully signed in as ${data.user.email}`,
        })

        // Redirect to main page after short delay
        setTimeout(() => {
          router.push("/")
        }, 1500)
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      setError(error.message || "Failed to sign in")
      toast({
        title: "Sign-in failed",
        description: error.message || "Failed to sign in. Please check your credentials.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      if (!fullName.trim()) {
        setError("Please enter your full name")
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long")
        return
      }

      const { data } = await signUp(email, password, fullName.trim())

      if (data?.user) {
        setRegistrationComplete(true)
        setSuccess(`Registration completed successfully! Welcome, ${fullName}!`)

        toast({
          title: "Registration Done! 🎉",
          description: `Welcome to WhispShare, ${fullName}! Redirecting to main page...`,
        })

        // Redirect to main page after showing success message
        setTimeout(() => {
          router.push("/")
        }, 2500)
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
      setError(error.message || "Failed to create account")

      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGuestContinue = () => {
    router.push("/")
  }

  // Show registration complete state
  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-600 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-600 mb-2">Registration Done! 🎉</h1>
                <p className="text-muted-foreground">Welcome to WhispShare, {fullName}!</p>
                <p className="text-sm text-muted-foreground mt-2">Redirecting to main page...</p>
              </div>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Shield className="h-16 w-16 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-blue-600 mb-2">Welcome to WhispShare</h1>
          <p className="text-muted-foreground">Ephemeral, Location-Based File Sharing</p>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">Error</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {success && (
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">Success</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Lock className="h-5 w-5 text-blue-600" />
            <span>End-to-end encryption</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-5 w-5 text-purple-600" />
            <span>Location-based sharing within 100km</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Zap className="h-5 w-5 text-green-600" />
            <span>Ephemeral by design</span>
          </div>
        </div>

        {/* Sign In/Up Options */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                    Sign In with Email
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative mt-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">INSTANT ACCESS</span>
              </div>
            </div>

            <Button onClick={handleGuestContinue} variant="outline" className="w-full bg-transparent mt-4" size="lg">
              Continue as Guest
            </Button>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Instant Registration</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  No email confirmation required. Create your account and start sharing files immediately with
                  military-grade encryption.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="link" onClick={() => router.push("/")}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
