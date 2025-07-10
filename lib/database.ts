import { supabase } from './supabase'

// Helper functions for database operations
export const createUserProfile = async (user: any, fullName?: string) => {
  try {
    if (!user?.id) {
      throw new Error("User ID is required")
    }

    const profileData = {
      id: user.id,
      email: user.email,
      full_name: fullName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      provider: "email",
      provider_id: null,
      last_sign_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" })
      .select()

    if (error) {
      console.error("Error creating user profile:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Profile creation error:", error)
    throw error
  }
}

export const ensureUserProfile = async (user: any) => {
  try {
    if (!user?.id) return null

    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking profile:", checkError)
    }

    if (!existingProfile) {
      return await createUserProfile(user)
    }

    return existingProfile
  } catch (error) {
    console.error("Error ensuring user profile:", error)
    return null
  }
}

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (error) {
      console.error("Error fetching user profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

// Safe logging function that handles missing tables gracefully
export const logUserActivity = async (
  userId: string | null,
  activityType: string,
  fileId?: string | null,
  metadata?: any
) => {
  try {
    const { error } = await supabase.from("user_activity_logs").insert({
      user_id: userId,
      activity_type: activityType,
      file_id: fileId,
      metadata: metadata,
    })

    if (error) {
      console.warn("Could not log user activity:", error.message)
    }
  } catch (error) {
    console.warn("Activity logging failed:", error)
  }
}

// Check if required tables exist
export const checkDatabaseSetup = async () => {
  try {
    // Test basic table access
    const { error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)

    const { error: filesError } = await supabase
      .from("files")
      .select("id")
      .limit(1)

    const { error: logsError } = await supabase
      .from("user_activity_logs")
      .select("id")
      .limit(1)

    return {
      profiles: !profilesError,
      files: !filesError,
      user_activity_logs: !logsError,
      allTablesReady: !profilesError && !filesError && !logsError
    }
  } catch (error) {
    console.error("Database setup check failed:", error)
    return {
      profiles: false,
      files: false,
      user_activity_logs: false,
      allTablesReady: false
    }
  }
}