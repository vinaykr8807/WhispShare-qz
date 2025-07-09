import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI("AIzaSyCb2ZXTZ5dHUMXNRqpVoI4xtLDZjF4Kdbc")

export const getChatResponse = async (message: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `You are WhispShare AI Assistant, a professional and friendly AI helper for a secure, location-based file sharing platform designed for HR environments. 

Key features of WhispShare:
- Files are only visible to users within 100km proximity (expanded from 5km for better accessibility)
- Files automatically expire and disappear (ephemeral)
- Unique codes for secure file sharing
- End-to-end encryption for security
- Google OAuth authentication
- AI-powered security analysis
- Professional HR-appropriate interface

Your role:
- Help users understand how to use WhispShare
- Explain security features and best practices
- Assist with file sharing workflows
- Answer questions about location-based sharing and unique codes (100km range)
- Maintain a professional, helpful, and friendly tone
- Keep responses concise and actionable
- Focus on privacy, security, and ease of use

User message: ${message}

Please provide a helpful, professional response.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text || text.trim() === "") {
      return "I apologize, but I couldn't generate a response. Please try rephrasing your question."
    }

    return text
  } catch (error) {
    console.error("Gemini API error:", error)

    // Provide more specific error handling
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return "I'm experiencing authentication issues. Please contact support if this persists."
      } else if (error.message.includes("quota")) {
        return "I'm currently experiencing high demand. Please try again in a moment."
      } else if (error.message.includes("network")) {
        return "I'm having connectivity issues. Please check your internet connection and try again."
      }
    }

    return "I apologize, but I'm currently experiencing technical difficulties. Please try again in a moment."
  }
}
