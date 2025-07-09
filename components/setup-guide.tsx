"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, ExternalLink, Copy, Database, Settings, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function SetupGuide() {
  const { toast } = useToast()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    })
  }

  const supabaseUrl = "https://fcnehpaubkdlepqcbdct.supabase.co"
  const redirectUrl = `${supabaseUrl}/auth/v1/callback`

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">WhispShare Setup Guide</h1>
        <p className="text-muted-foreground">Complete these steps to enable Google OAuth authentication</p>
      </div>

      {/* Step 1: Google Cloud Console */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Step 1: Google Cloud Console Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">1.1</Badge>
              <span>Go to Google Cloud Console</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://console.cloud.google.com", "_blank")}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Console
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">1.2</Badge>
              <span>Create a new project or select existing one</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">1.3</Badge>
              <span>Enable Google+ API and OAuth consent screen</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">1.4</Badge>
              <span>Create OAuth 2.0 Client ID credentials</span>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Authorized redirect URI:</strong>
                <div className="flex items-center gap-2 mt-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm flex-1">{redirectUrl}</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(redirectUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Supabase Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Step 2: Supabase Auth Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">2.1</Badge>
              <span>Go to Supabase Dashboard → Authentication → Settings</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open("https://supabase.com/dashboard/project/fcnehpaubkdlepqcbdct/auth/settings", "_blank")
                }
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Settings
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">2.2</Badge>
              <span>Scroll to "Auth Providers" section</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">2.3</Badge>
              <span>Enable Google provider</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">2.4</Badge>
              <span>Add your Google Client ID and Client Secret</span>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Site URL:</strong> Add your domain (e.g., https://your-domain.com)
                <br />
                <strong>Redirect URLs:</strong> Add https://your-domain.com/auth/callback
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Database Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Step 3: Database Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">3.1</Badge>
              <span>Go to Supabase SQL Editor</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://supabase.com/dashboard/project/fcnehpaubkdlepqcbdct/sql", "_blank")}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open SQL Editor
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">3.2</Badge>
              <span>Execute the manual setup script</span>
            </div>

            <Alert>
              <AlertDescription>
                <strong>SQL Script to execute:</strong>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <pre className="text-sm overflow-x-auto">
                    {`-- Add OAuth columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(provider);

-- Update existing profiles
UPDATE profiles 
SET provider = 'email', last_sign_in_at = NOW() 
WHERE provider IS NULL;`}
                  </pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-transparent"
                  onClick={() =>
                    copyToClipboard(`-- Add OAuth columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(provider);

-- Update existing profiles
UPDATE profiles 
SET provider = 'email', last_sign_in_at = NOW() 
WHERE provider IS NULL;`)
                  }
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Step 4: Test Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">4.1</Badge>
              <span>Test Google OAuth sign-in</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">4.2</Badge>
              <span>Test email sign-up and confirmation</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">4.3</Badge>
              <span>Verify user profiles are created correctly</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">4.4</Badge>
              <span>Test authentication persistence across sessions</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Your Supabase environment variables are already configured in this project:
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>NEXT_PUBLIC_SUPABASE_URL</li>
              <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              <li>SUPABASE_SERVICE_ROLE_KEY</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
