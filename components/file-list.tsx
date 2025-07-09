"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, File, MapPin, Clock, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentLocation } from "@/lib/location"
import { useToast } from "@/hooks/use-toast"

interface NearbyFile {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  storage_path: string
  latitude: number
  longitude: number
  created_at: string
  distance_meters: number
  uploader_name: string
}

export function FileList() {
  const [files, setFiles] = useState<NearbyFile[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { toast } = useToast()

  const loadNearbyFiles = async () => {
    try {
      setLoading(true)
      const location = await getCurrentLocation()
      setUserLocation({ lat: location.latitude, lng: location.longitude })

      const { data, error } = await supabase.rpc("get_nearby_files", {
        user_lat: location.latitude,
        user_lng: location.longitude,
        radius_meters: 1000,
      })

      if (error) {
        throw error
      }

      setFiles(data || [])
    } catch (error) {
      console.error("Error loading nearby files:", error)
      toast({
        title: "Error loading files",
        description: "Could not load nearby files. Please check your location permissions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNearbyFiles()
  }, [])

  const downloadFile = async (file: NearbyFile) => {
    try {
      // Record the download
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("downloads").insert({
          file_id: file.id,
          user_id: user.id,
        })
      }

      // Get signed URL for download
      const { data, error } = await supabase.storage.from("files").createSignedUrl(file.storage_path, 3600) // 1 hour expiry

      if (error) {
        throw error
      }

      // Create download link
      const link = document.createElement("a")
      link.href = data.signedUrl
      link.download = file.original_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download started",
        description: `Downloading ${file.original_name}`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: "Could not download the file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`
    }
    return `${(meters / 1000).toFixed(1)}km away`
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Finding nearby files...</p>
        </CardContent>
      </Card>
    )
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <File className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No files nearby</h3>
          <p className="text-gray-500 mb-4">No files are currently shared within 1km of your location.</p>
          <Button onClick={loadNearbyFiles} variant="outline">
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Nearby Files ({files.length})</h2>
        <Button onClick={loadNearbyFiles} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {files.map((file) => (
          <Card key={file.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <File className="h-10 w-10 text-blue-500 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{file.original_name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {file.uploader_name || "Anonymous"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {formatDistance(file.distance_meters)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(file.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{formatFileSize(file.file_size)}</Badge>
                      <Badge variant="outline">{file.mime_type.split("/")[0]}</Badge>
                    </div>
                  </div>
                </div>
                <Button onClick={() => downloadFile(file)} size="sm" className="ml-4">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
