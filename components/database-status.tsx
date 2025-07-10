"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { checkDatabaseSetup } from "@/lib/database"

interface DatabaseStatus {
  profiles: boolean
  files: boolean
  user_activity_logs: boolean
  allTablesReady: boolean
}

export function DatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const dbStatus = await checkDatabaseSetup()
      setStatus(dbStatus)
    } catch (error) {
      console.error("Failed to check database status:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Checking Database Status...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className="w-full max-w-md border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Database Check Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkStatus} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Check
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full max-w-md ${status.allTablesReady ? 'border-green-200' : 'border-yellow-200'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status.allTablesReady ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          Database Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Profiles Table</span>
            <Badge variant={status.profiles ? "default" : "destructive"}>
              {status.profiles ? "Ready" : "Missing"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Files Table</span>
            <Badge variant={status.files ? "default" : "destructive"}>
              {status.files ? "Ready" : "Missing"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Activity Logs</span>
            <Badge variant={status.user_activity_logs ? "default" : "destructive"}>
              {status.user_activity_logs ? "Ready" : "Missing"}
            </Badge>
          </div>
        </div>

        {!status.allTablesReady && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Some database tables are missing. Please run the migration scripts in your Supabase dashboard.
            </p>
          </div>
        )}

        <Button onClick={checkStatus} variant="outline" className="w-full mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  )
}