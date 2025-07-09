// Natural Language Processing utilities for WhispShare
export interface ProcessedQuery {
  intent: string
  keywords: string[]
  entities: string[]
  timeFilter?: string
  fileTypes: string[]
  userMentions: string[]
  sizeFilter?: { operator: string; value: number; unit: string }
}

export const processNaturalLanguageQuery = async (query: string): Promise<ProcessedQuery> => {
  const lowerQuery = query.toLowerCase()

  // Intent classification
  const intent = classifyIntent(lowerQuery)

  // Extract keywords (simple tokenization and stopword removal)
  const keywords = extractKeywords(lowerQuery)

  // Extract named entities
  const entities = extractEntities(lowerQuery)

  // Extract time filters
  const timeFilter = extractTimeFilter(lowerQuery)

  // Extract file types
  const fileTypes = extractFileTypes(lowerQuery)

  // Extract user mentions
  const userMentions = extractUserMentions(lowerQuery)

  // Extract size filters
  const sizeFilter = extractSizeFilter(lowerQuery)

  return {
    intent,
    keywords,
    entities,
    timeFilter,
    fileTypes,
    userMentions,
    sizeFilter,
  }
}

const classifyIntent = (query: string): string => {
  const intentPatterns = {
    search_files: ["show me", "find", "search", "get", "list"],
    filter_by_type: ["documents", "images", "presentations", "spreadsheets"],
    filter_by_time: ["today", "yesterday", "this week", "last week", "recent"],
    filter_by_user: ["from", "by", "uploaded by", "shared by"],
    filter_by_size: ["large", "small", "big", "mb", "gb", "over", "under"],
  }

  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    if (patterns.some((pattern) => query.includes(pattern))) {
      return intent
    }
  }

  return "general_search"
}

const extractKeywords = (query: string): string[] => {
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "show",
    "me",
    "find",
    "search",
    "get",
    "list",
    "what",
    "where",
    "when",
    "how",
    "who",
  ])

  return query
    .split(/\s+/)
    .map((word) => word.replace(/[^\w]/g, ""))
    .filter((word) => word.length > 2 && !stopwords.has(word))
}

const extractEntities = (query: string): string[] => {
  const entities = []

  // Simple pattern matching for common entities
  const patterns = {
    PERSON: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    ORGANIZATION: /\b(HR|IT|Finance|Marketing|Sales)\b/gi,
    FILE_FORMAT: /\b(PDF|DOC|DOCX|XLS|XLSX|PPT|PPTX|JPG|PNG|GIF)\b/gi,
  }

  for (const [type, pattern] of Object.entries(patterns)) {
    const matches = query.match(pattern)
    if (matches) {
      entities.push(...matches.map((match) => `${type}:${match}`))
    }
  }

  return entities
}

const extractTimeFilter = (query: string): string | undefined => {
  const timePatterns = {
    today: /\b(today|this day)\b/i,
    yesterday: /\b(yesterday)\b/i,
    week: /\b(this week|last week|past week)\b/i,
    month: /\b(this month|last month|past month)\b/i,
  }

  for (const [period, pattern] of Object.entries(timePatterns)) {
    if (pattern.test(query)) {
      return period
    }
  }

  return undefined
}

const extractFileTypes = (query: string): string[] => {
  const typePatterns = {
    document: /\b(documents?|docs?|pdf|word|text)\b/i,
    presentation: /\b(presentations?|slides?|powerpoint|ppt)\b/i,
    spreadsheet: /\b(spreadsheets?|excel|csv|data)\b/i,
    image: /\b(images?|photos?|pictures?|jpg|png|gif)\b/i,
    video: /\b(videos?|movies?|mp4|avi)\b/i,
    audio: /\b(audio|music|sound|mp3|wav)\b/i,
  }

  const types = []
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(query)) {
      types.push(type)
    }
  }

  return types
}

const extractUserMentions = (query: string): string[] => {
  const userPatterns = [
    /\bfrom ([A-Z][a-z]+ [A-Z][a-z]+)\b/gi,
    /\bby ([A-Z][a-z]+ [A-Z][a-z]+)\b/gi,
    /\buploaded by ([A-Z][a-z]+ [A-Z][a-z]+)\b/gi,
    /\bshared by ([A-Z][a-z]+ [A-Z][a-z]+)\b/gi,
  ]

  const mentions = []
  for (const pattern of userPatterns) {
    const matches = [...query.matchAll(pattern)]
    mentions.push(...matches.map((match) => match[1]))
  }

  return mentions
}

const extractSizeFilter = (query: string): { operator: string; value: number; unit: string } | undefined => {
  const sizePattern = /\b(over|under|above|below|larger than|smaller than|more than|less than)\s+(\d+)\s*(mb|gb|kb)\b/i
  const match = query.match(sizePattern)

  if (match) {
    const operator = ["over", "above", "larger than", "more than"].includes(match[1].toLowerCase()) ? "gt" : "lt"
    return {
      operator,
      value: Number.parseInt(match[2]),
      unit: match[3].toLowerCase(),
    }
  }

  return undefined
}

// Sentiment analysis for chat messages
export const analyzeSentiment = (
  text: string,
): { sentiment: "positive" | "negative" | "neutral"; confidence: number } => {
  const positiveWords = [
    "good",
    "great",
    "excellent",
    "amazing",
    "wonderful",
    "fantastic",
    "love",
    "like",
    "happy",
    "pleased",
  ]
  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "hate",
    "dislike",
    "angry",
    "frustrated",
    "disappointed",
    "problem",
    "issue",
  ]

  const words = text.toLowerCase().split(/\s+/)
  let positiveScore = 0
  let negativeScore = 0

  words.forEach((word) => {
    if (positiveWords.includes(word)) positiveScore++
    if (negativeWords.includes(word)) negativeScore++
  })

  const totalScore = positiveScore + negativeScore
  if (totalScore === 0) {
    return { sentiment: "neutral", confidence: 0.5 }
  }

  if (positiveScore > negativeScore) {
    return { sentiment: "positive", confidence: positiveScore / totalScore }
  } else if (negativeScore > positiveScore) {
    return { sentiment: "negative", confidence: negativeScore / totalScore }
  } else {
    return { sentiment: "neutral", confidence: 0.5 }
  }
}

// Text summarization (simple extractive approach)
export const summarizeText = (text: string, maxLength = 100): string => {
  if (text.length <= maxLength) return text

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  if (sentences.length <= 1) {
    return text.substring(0, maxLength) + "..."
  }

  // Score sentences by word frequency
  const words = text.toLowerCase().split(/\s+/)
  const wordFreq: { [key: string]: number } = {}

  words.forEach((word) => {
    word = word.replace(/[^\w]/g, "")
    if (word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })

  const sentenceScores = sentences.map((sentence) => {
    const sentenceWords = sentence.toLowerCase().split(/\s+/)
    const score = sentenceWords.reduce((sum, word) => {
      word = word.replace(/[^\w]/g, "")
      return sum + (wordFreq[word] || 0)
    }, 0)
    return { sentence: sentence.trim(), score }
  })

  // Sort by score and take top sentences
  sentenceScores.sort((a, b) => b.score - a.score)

  let summary = ""
  for (const { sentence } of sentenceScores) {
    if (summary.length + sentence.length <= maxLength) {
      summary += sentence + ". "
    } else {
      break
    }
  }

  return summary.trim() || text.substring(0, maxLength) + "..."
}
