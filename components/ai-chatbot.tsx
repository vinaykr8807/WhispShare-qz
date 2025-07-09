"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, X, Minimize2, Sparkles, Brain, Zap } from "lucide-react"
import { getChatResponse } from "@/lib/gemini"
import { analyzeSentiment } from "@/lib/nlp-processor"
import { supabase } from "@/lib/supabase"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  sentiment?: { sentiment: "positive" | "negative" | "neutral"; confidence: number }
  intent?: string
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm WhispShare AI, your intelligent assistant powered by advanced ML and NLP. I can help you with:\n\n🔍 Smart file search using natural language\n🏷️ Understanding file content and auto-tagging\n🛡️ Security insights and anomaly detection\n📊 Usage analytics and patterns\n📍 Find files within 100km of your location\n\nHow can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userSentiment, setUserSentiment] = useState<string>("neutral")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const quickQuestions = [
    "How does AI-powered search work?",
    "What ML models are running?",
    "Show me security insights",
    "How does anomaly detection work?",
    "What file types are best supported?",
    "Explain the auto-tagging feature",
  ]

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    // Analyze user sentiment
    const sentiment = analyzeSentiment(content)
    setUserSentiment(sentiment.sentiment)

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      isUser: true,
      timestamp: new Date(),
      sentiment,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      console.log("Sending message to Gemini API:", content)
      console.log("User sentiment:", sentiment)

      // Enhanced prompt with ML/NLP context
      const enhancedPrompt = `User message: "${content}"
      User sentiment: ${sentiment.sentiment} (confidence: ${sentiment.confidence.toFixed(2)})
      
      Context: This is WhispShare, an AI-powered file sharing platform with ML/NLP features including:
      - Smart search with natural language processing
      - Auto-tagging and content classification
      - Anomaly detection for security
      - Intent recognition and sentiment analysis
      - File content summarization
      
      Please provide a helpful, context-aware response that addresses the user's query while considering their emotional state.`

      const response = await getChatResponse(enhancedPrompt)
      console.log("Received response from Gemini:", response)

      // Log the interaction for ML analysis
      await logChatInteraction(content, response, sentiment)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Error getting AI response:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "I apologize, but I'm experiencing technical difficulties with my ML models. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const logChatInteraction = async (userMessage: string, aiResponse: string, sentiment: any) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Log to user activity
      await supabase.from("user_activity_logs").insert({
        user_id: user?.id || null,
        activity_type: "ai_chat",
        metadata: {
          user_message: userMessage,
          ai_response: aiResponse,
          sentiment: sentiment,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error("Error logging chat interaction:", error)
    }
  }

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question)
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600"
      case "negative":
        return "text-red-600"
      default:
        return "text-blue-600"
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "😊"
      case "negative":
        return "😟"
      default:
        return "😐"
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        size="icon"
      >
        <Brain className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className={`fixed bottom-6 right-6 w-96 h-[600px] shadow-xl z-50 flex flex-col ${isMinimized ? "h-14" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="w-4 h-4" />
          WhispShare AI Assistant
          <div className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              ML/NLP
            </Badge>
          </div>
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[420px] p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.isUser
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                          : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div
                        className={`text-xs mt-1 opacity-70 flex items-center justify-between ${
                          message.isUser ? "text-purple-100" : "text-gray-500"
                        }`}
                      >
                        <span>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {message.sentiment && (
                          <span className="flex items-center gap-1">
                            <span>{getSentimentIcon(message.sentiment.sentiment)}</span>
                            <span className={getSentimentColor(message.sentiment.sentiment)}>
                              {message.sentiment.sentiment}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                      <div className="flex space-x-1 items-center">
                        <Brain className="w-4 h-4 text-purple-600 animate-pulse" />
                        <span className="text-purple-600">AI is thinking...</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-500 mb-2">Quick questions about AI features:</p>
                <div className="grid grid-cols-1 gap-1">
                  {quickQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 justify-start bg-transparent hover:bg-purple-50"
                      onClick={() => handleQuickQuestion(question)}
                      disabled={isLoading}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-4 border-t">
            {userSentiment !== "neutral" && (
              <div className="mb-2 text-xs text-center">
                <Badge variant="outline" className={`${getSentimentColor(userSentiment)} border-current`}>
                  Mood detected: {getSentimentIcon(userSentiment)} {userSentiment}
                </Badge>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Ask about ML/NLP features..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" />
              Powered by Gemini AI + ML/NLP
            </p>
          </div>
        </>
      )}
    </Card>
  )
}
