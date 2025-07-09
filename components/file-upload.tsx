"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentLocation } from "@/lib/location"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  onUploadComplete?: () => void
}

interface UploadingFile {
  file: File
  progress: number
  status: "uploading" | "success" | "error"
  id: string
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const { toast } = useToast()

  const uploadFile = async (file: File) => {
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
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Create unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `uploads/${user.id}/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("files").upload(filePath, file, {
        onUploadProgress: (progress) => {
          const percentage = (progress.loaded / progress.total) * 100
          setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: percentage } : f)))
        },
      })

      if (uploadError) {
        throw uploadError
      }

      // Set expiry time (24 hours from now)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      // Save file metadata to database
      const { error: dbError } = await supabase.from("files").insert({
        user_id: user.id,
        filename: fileName,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: filePath,
        latitude: location.latitude,
        longitude: location.longitude,
        expires_at: expiresAt.toISOString(),
      })

      if (dbError) {
        throw dbError
      }

      setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: "success" } : f)))

      toast({
        title: "File uploaded successfully",
        description: `${file.name} is now available to nearby users for 24 hours.`,
      })

      onUploadComplete?.()
    } catch (error) {
      console.error("Upload error:", error)
      setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error" } : f)))

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      })
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(uploadFile)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
  })

  const removeFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
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
              Maximum file size: 100MB • AI-powered security analysis included
            </p>
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
                    <p className="text-xs text-gray-500">{(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    {uploadingFile.status === "uploading" && (
                      <Progress value={uploadingFile.progress} className="mt-2" />
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
