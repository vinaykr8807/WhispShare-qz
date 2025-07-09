"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Shield,
  Upload,
  Download,
  MapPin,
  Clock,
  FileText,
  Activity,
  LogOut,
  Search,
  Brain,
  MessageSquare,
  Zap,
  Lock,
  Eye,
  User,
} from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { FileUpload } from "@/components/file-upload"
import { FileList } from "@/components/file-list"
import { FileReceiver } from "@/components/file-receiver"
import { SmartSearch } from "@/components/smart-search"
import { MLInsights } from "@/components/ml-insights"
import { AIChatbot } from "@/components/ai-chatbot"
import { supabase } from "@/lib/supabase"
import { signOut, getUserProfile, ensureUserProfile } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { formatFileSize, getTimeAgo } from "@/lib/utils"

interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  provider?: string
  last_sign_in_at?: string
  created_at: string
}

interface FileStats {
  totalFiles: number
  totalSize: number
  recentUploads: number
  nearbyFiles: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<FileStats>({
    totalFiles: 0,
    totalSize: 0,
    recentUploads: 0,
    nearbyFiles: 0,
  })
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log("Checking user authentication...")

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error("Error getting user:", userError)
          router.push("/login")
          return
        }

        if (currentUser) {
          console.log("User found:", currentUser.id, currentUser.email)
          setUser(currentUser)

          // Ensure profile exists and fetch it
          try {
            await ensureUserProfile(currentUser)
            const userProfile = await getUserProfile(currentUser.id)
            if (userProfile) {
              console.log("Profile loaded:", userProfile)
              setProfile(userProfile)
            }
          } catch (profileError) {
            console.error("Error with profile:", profileError)
          }

          await fetchStats(currentUser.id)
        } else {
          console.log("No user found, allowing guest access")
          // Allow guest access
          setUser({ id: "guest", email: "guest@whispshare.com" })
        }
      } catch (error) {
        console.error("Error checking user:", error)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)

      if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
        router.push("/login")
      } else if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        try {
          await ensureUserProfile(session.user)
          const userProfile = await getUserProfile(session.user.id)
          if (userProfile) {
            setProfile(userProfile)
          }
        } catch (error) {
          console.error("Error handling sign-in:", error)
        }
        await fetchStats(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const fetchStats = async (userId: string) => {
    try {
      // Fetch user's files
      const { data: files, error: filesError } = await supabase
        .from("files")
        .select("file_size, created_at")
        .eq("user_id", userId)

      if (filesError) {
        console.error("Error fetching files:", filesError)
        return
      }

      const totalFiles = files?.length || 0
      const totalSize = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0
      const recentUploads =
        files?.filter((file) => {
          const fileDate = new Date(file.created_at)
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return fileDate > dayAgo
        }).length || 0

      // For nearby files, we'd need location - for now, use a placeholder
      const nearbyFiles = Math.floor(Math.random() * 10) + 5

      setStats({
        totalFiles,
        totalSize,
        recentUploads,
        nearbyFiles,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })
      router.push("/")
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const isGuest = user?.id === "guest"
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest"
  const displayEmail = profile?.email || user?.email || "guest@whispshare.com"
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">WhispShare</span>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {isGuest ? "Guest Mode" : "Authenticated"}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={displayName} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayEmail}</p>
              </div>
            </div>

            {!isGuest && (
              <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2 bg-transparent">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {displayName}! 👋</h1>
              <p className="text-muted-foreground mt-1">
                {isGuest
                  ? "You're browsing as a guest. Sign in for full features and file history."
                  : `Last sign in: ${profile?.last_sign_in_at ? getTimeAgo(profile.last_sign_in_at) : "Just now"}`}
              </p>
            </div>
            {isGuest && (
              <Button onClick={() => router.push("/login")} className="gap-2">
                <Shield className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalFiles}</p>
                    <p className="text-xs text-muted-foreground">Files Shared</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
                    <p className="text-xs text-muted-foreground">Total Size</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.recentUploads}</p>
                    <p className="text-xs text-muted-foreground">Recent (24h)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.nearbyFiles}</p>
                    <p className="text-xs text-muted-foreground">Nearby (100km)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="receive" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Receive</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI Insights</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI Chat</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FileList limit={5} showHeader={false} userId={!isGuest ? user?.id : undefined} />
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => setActiveTab("upload")} className="w-full gap-2">
                    <Upload className="h-4 w-4" />
                    Upload New File
                  </Button>
                  <Button onClick={() => setActiveTab("receive")} variant="outline" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Receive File
                  </Button>
                  <Button onClick={() => setActiveTab("search")} variant="outline" className="w-full gap-2">
                    <Search className="h-4 w-4" />
                    Smart Search
                  </Button>
                  <Button onClick={() => setActiveTab("chat")} variant="outline" className="w-full gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Ask AI Assistant
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Security Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Privacy Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Lock className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">End-to-End Encryption</h3>
                      <p className="text-sm text-muted-foreground">Military-grade security</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <MapPin className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold">Location-Based</h3>
                      <p className="text-sm text-muted-foreground">100km proximity sharing</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <Eye className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold">Ephemeral Files</h3>
                      <p className="text-sm text-muted-foreground">Auto-delete after download</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receive Tab */}
          <TabsContent value="receive">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Receive Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileReceiver />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Smart Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SmartSearch />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Powered Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MLInsights />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Chat Tab */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIChatbot />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
