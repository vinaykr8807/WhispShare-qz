"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Download, MapPin, Clock, Search, RefreshCw, AlertCircle, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { formatFileSize, formatDistance, getTimeAgo } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getCurrentLocation } from "@/lib/location"

interface FileItem {
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
  user_id: string | null
}

interface FileListProps {
  limit?: number
  showHeader?: boolean
  userId?: string
}

export function FileList({ limit, showHeader = true, userId }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "nearby" | "recent">("all")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchFiles()
    getUserLocation()
  }, [userId, filterType])

  const getUserLocation = async () => {
    try {
      const location = await getCurrentLocation()
      setUserLocation(location)
    } catch (error) {
      console.error("Error getting location:", error)
    }
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)
      let query = supabase.from("files").select("*")

      // Filter by user if specified
      if (userId) {
        query = query.eq("user_id", userId)
      }

      // Apply filters
      if (filterType === "recent") {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        query = query.gte("created_at", dayAgo)
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit)
      }

      query = query.order("created_at", { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error("Error fetching files:", error)
        toast({
          title: "Error",
          description: "Failed to load files",
          variant: "destructive",
        })
        return
      }

      let processedFiles = data || []

      // Calculate distances if user location is available
      if (userLocation && filterType === "nearby") {
        processedFiles = processedFiles
          .filter((file) => file.latitude && file.longitude)
          .map((file) => {
            const distance = calculateDistance(userLocation.lat, userLocation.lng, file.latitude!, file.longitude!)
            return { ...file, distance_meters: distance }
          })
          .filter((file) => file.distance_meters! <= 100000) // 100km
          .sort((a, b) => a.distance_meters! - b.distance_meters!)
      }

      setFiles(processedFiles)
    } catch (error) {
      console.error("Error fetching files:", error)
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      })
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

  const downloadFile = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage.from("files").download(file.storage_path)

      if (error) {
        console.error("Error downloading file:", error)
        toast({
          title: "Download failed",
          description: "Failed to download file",
          variant: "destructive",
        })
        return
      }

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = file.original_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Mark as downloaded
      await supabase.from("files").update({ is_downloaded: true }).eq("id", file.id)

      // Record download
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("downloads").insert({
          file_id: file.id,
          user_id: user.id,
        })
      }

      toast({
        title: "Download successful",
        description: `Downloaded ${file.original_name}`,
      })

      // Refresh the list
      fetchFiles()
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive",
      })
    }
  }

  const filteredFiles = files.filter(
    (file) =>
      file.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.unique_code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "🖼️"
    if (mimeType.startsWith("video/")) return "🎥"
    if (mimeType.startsWith("audio/")) return "🎵"
    if (mimeType.includes("pdf")) return "📄"
    if (mimeType.includes("document") || mimeType.includes("word")) return "📝"
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊"
    return "📁"
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Files</h3>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Files ({filteredFiles.length})
          </h3>
          <Button onClick={fetchFiles} variant="outline" size="sm" className="gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files or codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")}>
            All
          </Button>
          <Button
            variant={filterType === "nearby" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("nearby")}
            className="gap-2"
          >
            <MapPin className="h-4 w-4" />
            Nearby
          </Button>
          <Button
            variant={filterType === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("recent")}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Recent
          </Button>
        </div>
      </div>

      {/* Files List */}
      <div className="space-y-2">
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No files found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : filterType === "nearby"
                      ? "No files found within 100km of your location"
                      : "Upload your first file to get started"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredFiles.map((file) => (
            <Card
              key={file.id}
              className={`transition-all hover:shadow-md ${isExpired(file.expires_at) ? "opacity-60" : ""}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-2xl">{getFileIcon(file.mime_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{file.original_name}</h4>
                        {file.is_downloaded && (
                          <Badge variant="secondary" className="gap-1">
                            <Eye className="h-3 w-3" />
                            Downloaded
                          </Badge>
                        )}
                        {isExpired(file.expires_at) && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Expired
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(file.created_at)}
                        </span>
                        {file.distance_meters !== undefined && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {formatDistance(file.distance_meters)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs font-mono">
                          {file.unique_code}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isExpired(file.expires_at) && (
                      <Button onClick={() => downloadFile(file)} size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
