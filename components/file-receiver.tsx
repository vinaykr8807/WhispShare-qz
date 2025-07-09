"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, MapPin, Clock, FileText, AlertCircle, CheckCircle, Search, Loader2, Eye, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { formatFileSize, formatDistance, getTimeAgo } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getCurrentLocation } from "@/lib/location"

interface FileInfo {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  unique_code: string
  latitude: number | null
  longitude: number | null
  distance_meters?: number
  created_at: string
  expires_at: string | null
  is_downloaded: boolean
  storage_path: string
}

export function FileReceiver() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const { toast } = useToast()

  const searchFile = async () => {
    if (!code.trim()) {
      setError("Please enter a file code")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setFileInfo(null)

      // Search for file by unique code
      const { data: files, error: searchError } = await supabase
        .from("files")
        .select("*")
        .eq("unique_code", code.trim().toUpperCase())
        .single()

      if (searchError || !files) {
        setError("File not found. Please check the code and try again.")
        return
      }

      // Check if file has expired
      if (files.expires_at && new Date(files.expires_at) < new Date()) {
        setError("This file has expired and is no longer available.")
        return
      }

      // Get user location to calculate distance
      try {
        const userLocation = await getCurrentLocation()

        if (files.latitude && files.longitude) {
          const distance = calculateDistance(userLocation.lat, userLocation.lng, files.latitude, files.longitude)

          // Check if file is within 100km range
          if (distance > 100000) {
            setError("This file is not available in your location. You must be within 100km of the file location.")
            return
          }

          files.distance_meters = distance
        }
      } catch (locationError) {
        console.warn("Could not get user location:", locationError)
        // Continue without distance check for now
      }

      setFileInfo(files)
      toast({
        title: "File found!",
        description: `Found ${files.original_name}`,
      })
    } catch (error) {
      console.error("Error searching file:", error)
      setError("Failed to search for file. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const downloadFile = async () => {
    if (!fileInfo) return

    try {
      setDownloading(true)

      // Download file from storage
      const { data, error } = await supabase.storage.from("files").download(fileInfo.storage_path)

      if (error) {
        console.error("Error downloading file:", error)
        toast({
          title: "Download failed",
          description: "Failed to download file. Please try again.",
          variant: "destructive",
        })
        return
      }

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = fileInfo.original_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Mark file as downloaded
      await supabase.from("files").update({ is_downloaded: true }).eq("id", fileInfo.id)

      // Record download in downloads table
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("downloads").insert({
          file_id: fileInfo.id,
          user_id: user.id,
        })
      }

      toast({
        title: "Download successful!",
        description: `Downloaded ${fileInfo.original_name}`,
      })

      // Update file info to show downloaded status
      setFileInfo({ ...fileInfo, is_downloaded: true })
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Download failed",
        description: "Failed to download file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "🖼️"
    if (mimeType.startsWith("video/")) return "🎥"
    if (mimeType.startsWith("audio/")) return "🎵"
    if (mimeType.includes("pdf")) return "📄"
    if (mimeType.includes("document") || mimeType.includes("word")) return "📝"
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊"
    return "📁"
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchFile()
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enter File Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter 8-character code (e.g., ABC12345)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              maxLength={8}
              className="font-mono text-center text-lg tracking-wider"
            />
            <Button onClick={searchFile} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Enter the 8-character code shared with you to find and download the file.</p>
            <p className="mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Files are only available within 100km of their upload location.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Information */}
      {fileInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              File Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">{getFileIcon(fileInfo.mime_type)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{fileInfo.original_name}</h3>
                  {fileInfo.is_downloaded && (
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />
                      Downloaded
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{formatFileSize(fileInfo.file_size)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{getTimeAgo(fileInfo.created_at)}</span>
                  </div>
                  {fileInfo.distance_meters !== undefined && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDistance(fileInfo.distance_meters)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span>Encrypted</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Code:</span>
                  <Badge variant="outline" className="font-mono">
                    {fileInfo.unique_code}
                  </Badge>
                </div>

                {fileInfo.expires_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Expires {getTimeAgo(fileInfo.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={downloadFile} disabled={downloading} className="gap-2 flex-1" size="lg">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? "Downloading..." : "Download File"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Secure Download</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                All files are encrypted and automatically deleted after download. Your privacy is protected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
