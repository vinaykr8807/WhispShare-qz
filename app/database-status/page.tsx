"use client"

import { DatabaseStatus } from "@/components/database-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Database, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DatabaseStatusPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Database className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">Database Status</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Supabase Database Status</h1>
            <p className="text-muted-foreground">
              Check if your Supabase database is properly configured for WhispShare
            </p>
          </div>

          <div className="flex justify-center">
            <DatabaseStatus />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">1. Run Database Migrations</h3>
                <p className="text-sm text-muted-foreground">
                  Go to your Supabase dashboard → SQL Editor and run the migration files:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
                  <li><code>supabase/migrations/20250110000001_initial_setup.sql</code></li>
                  <li><code>supabase/migrations/20250110000002_storage_setup.sql</code></li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">2. Configure Environment Variables</h3>
                <p className="text-sm text-muted-foreground">
                  Make sure your <code>.env.local</code> file contains the correct Supabase credentials.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">3. Enable Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Configure authentication providers in your Supabase dashboard if needed.
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => window.open("https://supabase.com/dashboard", "_blank")}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push("/")}
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}