"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Brain, FileText, User, MapPin, Clock, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentLocation } from "@/lib/location"
import { formatFileSize, formatDistance, getTimeAgo } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { processNaturalLanguageQuery } from "@/lib/nlp-processor"

interface SearchResult {
  id: string
  original_name: string
  file_size: number
  mime_type: string
  created_at: string
  distance_meters: number
  uploader_name: string
  ai_tags: string[]
  ai_summary: string
  relevance_score: number
}

export function SmartSearch() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchIntent, setSearchIntent] = useState<string>("")
  const { toast } = useToast()

  const exampleQueries = [
    "Show me HR policies shared today",
    "Find documents about security",
    "What presentations were uploaded this week?",
    "Show me files from John",
    "Find large files over 10MB",
  ]

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Enter search query",
        description: "Please enter a search query to find files",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Get current location
      const location = await getCurrentLocation()

      // Process natural language query using NLP
      const processedQuery = await processNaturalLanguageQuery(query)
      setSearchIntent(processedQuery.intent)

      console.log("Processed query:", processedQuery)

      // Build search parameters based on NLP analysis
      const searchParams: any = {}

      // Add date filters if detected
      if (processedQuery.timeFilter) {
        const now = new Date()
        if (processedQuery.timeFilter === "today") {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          searchParams.created_at = `gte.${today.toISOString()}`
        } else if (processedQuery.timeFilter === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          searchParams.created_at = `gte.${weekAgo.toISOString()}`
        }
      }

      // Add file type filters
      if (processedQuery.fileTypes.length > 0) {
        const mimeTypes = processedQuery.fileTypes.map((type) => {
          switch (type.toLowerCase()) {
            case "document":
              return "application/pdf"
            case "presentation":
              return "application/vnd.ms-powerpoint"
            case "spreadsheet":
              return "application/vnd.ms-excel"
            case "image":
              return "image/"
            default:
              return type
          }
        })
        searchParams.mime_type = `in.(${mimeTypes.join(",")})`
      }

      // Search files with basic filters
      let searchQuery = supabase
        .from("files")
        .select(`
          id,
          original_name,
          file_size,
          mime_type,
          created_at,
          latitude,
          longitude,
          ai_tags,
          ai_summary,
          user_id
        `)
        .eq("is_downloaded", false)
        .gt("expires_at", new Date().toISOString())

      // Apply filters
      Object.entries(searchParams).forEach(([key, value]) => {
        searchQuery = searchQuery.filter(key, value as string)
      })

      const { data: files, error } = await searchQuery.limit(20)

      if (error) {
        throw error
      }

      if (!files || files.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different search query or check your filters",
        })
        setResults([])
        return
      }

      // Calculate distances and get uploader names
      const enrichedResults = await Promise.all(
        files.map(async (file) => {
          let distance = 0
          if (file.latitude && file.longitude) {
            distance = calculateDistance(location.latitude, location.longitude, file.latitude, file.longitude)
          }

          // Get uploader name
          let uploaderName = "Anonymous"
          if (file.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", file.user_id)
              .single()

            if (profile?.full_name) {
              uploaderName = profile.full_name
            }
          }

          // Calculate relevance score based on query matching
          const relevanceScore = calculateRelevanceScore(file, processedQuery)

          return {
            ...file,
            distance_meters: distance,
            uploader_name: uploaderName,
            ai_tags: file.ai_tags || [],
            ai_summary: file.ai_summary || "",
            relevance_score: relevanceScore,
          }
        }),
      )

      // Sort by relevance score and distance
      const sortedResults = enrichedResults
        .filter((result) => result.distance_meters <= 100000) // Changed from 5000 to 100000 (100km)
        .sort((a, b) => b.relevance_score - a.relevance_score)

      setResults(sortedResults)

      toast({
        title: "Search completed",
        description: `Found ${sortedResults.length} relevant files`,
      })
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Search failed",
        description: "An error occurred while searching. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const calculateRelevanceScore = (file: any, processedQuery: any): number => {
    let score = 0
    const fileName = file.original_name.toLowerCase()
    const tags = (file.ai_tags || []).join(" ").toLowerCase()
    const summary = (file.ai_summary || "").toLowerCase()

    // Check for keyword matches
    processedQuery.keywords.forEach((keyword: string) => {
      const lowerKeyword = keyword.toLowerCase()
      if (fileName.includes(lowerKeyword)) score += 3
      if (tags.includes(lowerKeyword)) score += 2
      if (summary.includes(lowerKeyword)) score += 1
    })

    // Boost score for recent files
    const daysSinceCreated = (Date.now() - new Date(file.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated < 1) score += 2
    else if (daysSinceCreated < 7) score += 1

    return score
  }

  const handleExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Natural Language Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask in plain English: 'Show me HR policies shared today'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {searchIntent && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Brain className="h-3 w-3" />
                Intent: {searchIntent}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try these example queries:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleQuery(example)}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Search Results ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{result.original_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {result.uploader_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatDistance(result.distance_meters)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(result.created_at)}
                        </span>
                      </div>

                      {result.ai_summary && (
                        <p className="text-sm text-muted-foreground mt-2 italic">"{result.ai_summary}"</p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{formatFileSize(result.file_size)}</Badge>
                        <Badge variant="outline">{result.mime_type.split("/")[0]}</Badge>
                        <Badge variant="outline" className="gap-1">
                          <Brain className="h-3 w-3" />
                          {result.relevance_score}% match
                        </Badge>
                      </div>

                      {result.ai_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.ai_tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
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
