import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: "sk-082e38f0760949b9b9e2b588c1ed8025",
  dangerouslyAllowBrowser: true,
})

export const getChatResponse = async (message: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are WhispShare AI Assistant, a professional and friendly AI helper for a secure, location-based file sharing platform designed for HR environments. 

Key features of WhispShare:
- Files are only visible to users within 1km proximity
- Files automatically expire and disappear (ephemeral)
- End-to-end encryption for security
- Google OAuth authentication
- AI-powered security analysis
- Professional HR-appropriate interface

Your role:
- Help users understand how to use WhispShare
- Explain security features and best practices
- Assist with file sharing workflows
- Answer questions about location-based sharing
- Maintain a professional, helpful, and friendly tone
- Keep responses concise and actionable
- Focus on privacy, security, and ease of use

Always be helpful, professional, and emphasize the security and privacy benefits of the platform.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    return (
      response.choices[0]?.message?.content ||
      "I apologize, but I encountered an issue processing your request. Please try again."
    )
  } catch (error) {
    console.error("OpenAI API error:", error)
    return "I apologize, but I'm currently experiencing technical difficulties. Please try again in a moment."
  }
}
