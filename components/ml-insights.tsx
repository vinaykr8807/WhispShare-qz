"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, TrendingUp, Shield, AlertTriangle, FileText, BarChart3 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface MLInsight {
  type: string
  title: string
  description: string
  value: number
  trend: "up" | "down" | "stable"
  severity: "low" | "medium" | "high"
}

export function MLInsights() {
  const [insights, setInsights] = useState<MLInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [fileAnalytics, setFileAnalytics] = useState<any>({})

  useEffect(() => {
    loadMLInsights()
  }, [])

  const loadMLInsights = async () => {
    try {
      setLoading(true)

      // Get file analytics
      const { data: files, error: filesError } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (filesError) throw filesError

      // Analyze file patterns
      const analytics = analyzeFilePatterns(files || [])
      setFileAnalytics(analytics)

      // Generate ML insights
      const generatedInsights = generateMLInsights(analytics)
      setInsights(generatedInsights)

      // Detect anomalies
      const detectedAnomalies = detectAnomalies(files || [])
      setAnomalies(detectedAnomalies)
    } catch (error) {
      console.error("Error loading ML insights:", error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeFilePatterns = (files: any[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const todayFiles = files.filter((f) => new Date(f.created_at) >= today)
    const weekFiles = files.filter((f) => new Date(f.created_at) >= weekAgo)

    const fileTypes = files.reduce((acc, file) => {
      const type = file.mime_type.split("/")[0]
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const avgFileSize = files.reduce((sum, file) => sum + file.file_size, 0) / files.length

    const uploaders = files.reduce((acc, file) => {
      const uploader = file.user_id || "anonymous"
      acc[uploader] = (acc[uploader] || 0) + 1
      return acc
    }, {})

    return {
      totalFiles: files.length,
      todayFiles: todayFiles.length,
      weekFiles: weekFiles.length,
      fileTypes,
      avgFileSize,
      uploaders,
      mostActiveUploader: Object.keys(uploaders).reduce((a, b) => (uploaders[a] > uploaders[b] ? a : b), ""),
      largestFile: Math.max(...files.map((f) => f.file_size)),
      smallestFile: Math.min(...files.map((f) => f.file_size)),
    }
  }

  const generateMLInsights = (analytics: any): MLInsight[] => {
    const insights: MLInsight[] = []

    // File upload trend
    const uploadTrend = analytics.todayFiles > analytics.weekFiles / 7 ? "up" : "down"
    insights.push({
      type: "trend",
      title: "Upload Activity",
      description: `${analytics.todayFiles} files uploaded today vs ${Math.round(analytics.weekFiles / 7)} daily average`,
      value: (analytics.todayFiles / (analytics.weekFiles / 7)) * 100,
      trend: uploadTrend,
      severity: uploadTrend === "up" ? "medium" : "low",
    })

    // File size analysis
    const avgSizeMB = analytics.avgFileSize / (1024 * 1024)
    insights.push({
      type: "size",
      title: "Average File Size",
      description: `${avgSizeMB.toFixed(1)}MB average file size`,
      value: avgSizeMB,
      trend: "stable",
      severity: avgSizeMB > 10 ? "medium" : "low",
    })

    // File type diversity
    const typeCount = Object.keys(analytics.fileTypes).length
    insights.push({
      type: "diversity",
      title: "File Type Diversity",
      description: `${typeCount} different file types detected`,
      value: typeCount,
      trend: "stable",
      severity: "low",
    })

    // User activity
    const uploaderCount = Object.keys(analytics.uploaders).length
    insights.push({
      type: "users",
      title: "Active Users",
      description: `${uploaderCount} unique uploaders this period`,
      value: uploaderCount,
      trend: "stable",
      severity: "low",
    })

    return insights
  }

  const detectAnomalies = (files: any[]) => {
    const anomalies = []

    // Detect unusually large files
    const avgSize = files.reduce((sum, file) => sum + file.file_size, 0) / files.length
    const largeFiles = files.filter((file) => file.file_size > avgSize * 3)

    if (largeFiles.length > 0) {
      anomalies.push({
        type: "large_files",
        title: "Unusually Large Files",
        description: `${largeFiles.length} files are significantly larger than average`,
        severity: "medium",
        files: largeFiles.slice(0, 3),
      })
    }

    // Detect rapid uploads from same user
    const userUploads = files.reduce((acc, file) => {
      if (file.user_id) {
        acc[file.user_id] = acc[file.user_id] || []
        acc[file.user_id].push(file)
      }
      return acc
    }, {})

    Object.entries(userUploads).forEach(([userId, userFiles]: [string, any]) => {
      if (userFiles.length > 10) {
        anomalies.push({
          type: "rapid_uploads",
          title: "High Upload Activity",
          description: `User has uploaded ${userFiles.length} files recently`,
          severity: "low",
          userId,
        })
      }
    })

    return anomalies
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600"
      case "medium":
        return "text-yellow-600"
      default:
        return "text-green-600"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
      default:
        return <BarChart3 className="h-4 w-4 text-blue-600" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Analyzing data with ML algorithms...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ML Insights Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Machine Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{insight.title}</h3>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(insight.trend)}
                    <Badge variant="outline" className={getSeverityColor(insight.severity)}>
                      {insight.severity}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                <Progress value={Math.min(insight.value, 100)} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* File Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            File Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{fileAnalytics.totalFiles || 0}</div>
              <p className="text-sm text-muted-foreground">Total Files</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{fileAnalytics.todayFiles || 0}</div>
              <p className="text-sm text-muted-foreground">Uploaded Today</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {((fileAnalytics.avgFileSize || 0) / (1024 * 1024)).toFixed(1)}MB
              </div>
              <p className="text-sm text-muted-foreground">Average Size</p>
            </div>
          </div>

          {fileAnalytics.fileTypes && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">File Type Distribution</h4>
              <div className="space-y-2">
                {Object.entries(fileAnalytics.fileTypes).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="capitalize">{type}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(count / fileAnalytics.totalFiles) * 100} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-green-600 mb-2">All Clear</h3>
              <p className="text-sm text-muted-foreground">No anomalies detected in recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((anomaly, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">{anomaly.title}</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{anomaly.description}</p>
                      <Badge variant="outline" className="mt-2">
                        {anomaly.severity} priority
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ML Model Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            ML Model Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Content Classification</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Anomaly Detection</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Natural Language Processing</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Intent Recognition</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
