"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ensureUserProfile } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function AuthCallback() {
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus("loading")
        setMessage("Processing email confirmation...")

        console.log("Starting auth callback process...")

        // Handle the OAuth callback by exchanging the code for a session
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth callback error:", error)
          setStatus("error")
          setMessage("Email confirmation failed. Please try again.")

          toast({
            title: "Confirmation Error",
            description: "Failed to confirm email. Please try again.",
            variant: "destructive",
          })

          setTimeout(() => {
            router.push("/login?error=auth_failed")
          }, 3000)
          return
        }

        if (data.session?.user) {
          const user = data.session.user
          console.log("User confirmed:", user.id, user.email)

          try {
            setMessage("Setting up your profile...")

            // Ensure user profile exists
            await ensureUserProfile(user)

            // Wait a moment for database triggers to complete
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Verify profile was created
            const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

            if (profile) {
              console.log("Profile verified:", profile)
            } else {
              console.log("Profile not found, but continuing...")
            }

            setStatus("success")
            setMessage(`Email confirmed! Welcome, ${user.user_metadata?.full_name || user.email}!`)

            toast({
              title: "Email Confirmed! 🎉",
              description: `Welcome to WhispShare, ${user.user_metadata?.full_name || user.email}!`,
            })

            // Clear the URL hash and redirect to main page after a brief delay
            setTimeout(() => {
              window.history.replaceState({}, document.title, window.location.pathname)
              router.push("/")
            }, 2000)
          } catch (profileError) {
            console.error("Profile setup error:", profileError)

            // Still redirect to main page even if profile setup fails
            setStatus("success")
            setMessage(`Email confirmed! Redirecting to main page...`)

            setTimeout(() => {
              window.history.replaceState({}, document.title, window.location.pathname)
              router.push("/")
            }, 2000)
          }
        } else {
          setStatus("error")
          setMessage("No user session found. Please try signing up again.")

          setTimeout(() => {
            router.push("/login")
          }, 2000)
        }
      } catch (error) {
        console.error("Callback handling error:", error)
        setStatus("error")
        setMessage("Something went wrong during email confirmation.")

        toast({
          title: "Error",
          description: "Something went wrong during email confirmation.",
          variant: "destructive",
        })

        setTimeout(() => {
          router.push("/login?error=callback_failed")
        }, 3000)
      }
    }

    // Check if we have tokens in the URL hash (email confirmation callback)
    if (window.location.hash || window.location.search) {
      handleAuthCallback()
    } else {
      // No hash or search params, check if user is already authenticated
      const checkUser = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setStatus("success")
          setMessage("Already signed in. Redirecting...")
          setTimeout(() => {
            router.push("/")
          }, 1000)
        } else {
          setStatus("error")
          setMessage("No confirmation data found. Redirecting to login...")
          setTimeout(() => {
            router.push("/login")
          }, 2000)
        }
      }
      checkUser()
    }
  }, [router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <Shield className="h-16 w-16 text-blue-600" />
                {status === "loading" && (
                  <Loader2 className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400 animate-spin" />
                )}
                {status === "success" && (
                  <CheckCircle className="absolute -top-1 -right-1 w-6 h-6 text-green-600 bg-white rounded-full" />
                )}
                {status === "error" && (
                  <AlertCircle className="absolute -top-1 -right-1 w-6 h-6 text-red-600 bg-white rounded-full" />
                )}
              </div>
            </div>

            {/* Status Message */}
            <div>
              <h1 className="text-2xl font-bold text-blue-600 mb-2">WhispShare</h1>
              <p className="text-muted-foreground">{message}</p>
            </div>

            {/* Loading Animation */}
            {status === "loading" && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Success Animation */}
            {status === "success" && (
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-600 animate-pulse" />
              </div>
            )}

            {/* Error Animation */}
            {status === "error" && (
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-red-600 animate-pulse" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
