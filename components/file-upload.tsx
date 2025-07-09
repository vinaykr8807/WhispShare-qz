"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, File, X, CheckCircle, AlertCircle, Copy, MapPin } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentLocation } from "@/lib/location"
import { generateUniqueCode, formatFileSize } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  onUploadComplete?: () => void
}

interface UploadingFile {
  file: File
  progress: number
  status: "uploading" | "success" | "error"
  id: string
  uniqueCode?: string
  error?: string
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const { toast } = useToast()

  const uploadFile = async (file: File) => {
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 50MB",
        variant: "destructive",
      })
      return
    }

    const fileId = Math.random().toString(36).substring(7)

    setUploadingFiles((prev) => [
      ...prev,
      {
        file,
        progress: 0,
        status: "uploading",
        id: fileId,
      },
    ])

    try {
      // Get current location
      const location = await getCurrentLocation()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Generate unique code
      const uniqueCode = generateUniqueCode()

      // Create unique filename with proper path structure
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = user ? `${user.id}/${fileName}` : `anonymous/${fileName}`

      console.log("Uploading file to path:", filePath)

      // Update progress to 25%
      setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 25 } : f)))

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage.from("files").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Storage upload error:", uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      console.log("File uploaded successfully:", uploadData)

      // Update progress to 75% after storage upload
      setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 75 } : f)))

      // Set expiry time (24 hours from now)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      // Prepare file record with ALL required fields
      const fileRecord = {
        user_id: user?.id || null,
        filename: fileName,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        storage_path: filePath,
        unique_code: uniqueCode,
        latitude: location.latitude,
        longitude: location.longitude,
        expires_at: expiresAt.toISOString(),
        is_downloaded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("Inserting file record:", fileRecord)

      // Insert file record into database
      const { data: dbData, error: dbError } = await supabase.from("files").insert(fileRecord).select()

      if (dbError) {
        console.error("Database insert error:", dbError)
        // Clean up uploaded file if database insert fails
        await supabase.storage.from("files").remove([filePath])
        throw new Error(`Database insert failed: ${dbError.message}`)
      }

      console.log("File record inserted successfully:", dbData)

      // Update location in PostGIS format
      if (location.latitude && location.longitude) {
        const { error: locationError } = await supabase
          .from("files")
          .update({
            location: `POINT(${location.longitude} ${location.latitude})`,
          })
          .eq("id", dbData[0].id)

        if (locationError) {
          console.warn("Location update error:", locationError)
          // Don't fail the upload for location update errors
        }
      }

      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: "success", uniqueCode } : f)),
      )

      toast({
        title: "File uploaded successfully",
        description: `${file.name} is now available with code: ${uniqueCode}`,
      })

      onUploadComplete?.()
    } catch (error) {
      console.error("Upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file"

      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "error", error: errorMessage } : f)),
      )

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(uploadFile)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  })

  const removeFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Code copied",
      description: "Unique code copied to clipboard",
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Drop your file here or click to browse</h3>
            <p className="text-sm text-gray-500 mb-4">
              Maximum file size: 50MB • AI-powered security analysis included
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600">Location-Based Sharing</span>
            </div>
            <Button>Choose File</Button>
          </div>
        </CardContent>
      </Card>

      {uploadingFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-4">Uploading Files</h4>
            <div className="space-y-3">
              {uploadingFiles.map((uploadingFile) => (
                <div
                  key={uploadingFile.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <File className="h-8 w-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(uploadingFile.file.size)}</p>
                    {uploadingFile.status === "uploading" && (
                      <Progress value={uploadingFile.progress} className="mt-2" />
                    )}
                    {uploadingFile.status === "success" && uploadingFile.uniqueCode && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="font-mono">
                          {uploadingFile.uniqueCode}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(uploadingFile.uniqueCode!)}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {uploadingFile.status === "error" && uploadingFile.error && (
                      <p className="text-xs text-red-500 mt-1">{uploadingFile.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadingFile.status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {uploadingFile.status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(uploadingFile.id)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
