import { supabase } from "./supabase"

export const signUp = async (email: string, password: string, fullName: string) => {
  try {
    console.log("Starting sign-up process for:", email, "with name:", fullName)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        // No email redirect needed since confirmation is disabled
      },
    })

    if (error) {
      console.error("Sign-up error:", error)

      if (error.message.includes("User already registered")) {
        throw new Error("An account with this email already exists. Please sign in instead.")
      }

      throw error
    }

    console.log("Sign-up successful:", data)

    if (data.user) {
      // With auto-confirmation, user should be immediately available
      await createUserProfile(data.user, fullName)
      return data
    }

    throw new Error("Failed to create user account")
  } catch (error) {
    console.error("Sign-up error:", error)
    throw error
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    console.log("Starting sign-in process for:", email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Sign-in error:", error)

      if (error.message.includes("Invalid login credentials")) {
        throw new Error("Invalid email or password. Please check your credentials.")
      }

      throw error
    }

    console.log("Sign-in successful:", data)

    if (data.user) {
      // Ensure profile exists
      await ensureUserProfile(data.user)
      return data
    }

    throw new Error("Failed to sign in")
  } catch (error) {
    console.error("Sign-in error:", error)
    throw error
  }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error("Error signing out:", error)
    throw error
  }
}

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    console.error("Error getting current user:", error)
    return null
  }
  return user
}

export const createUserProfile = async (user: any, fullName?: string) => {
  try {
    if (!user?.id) {
      throw new Error("User ID is required")
    }

    console.log("Creating profile for user:", user.id, "with name:", fullName)

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

    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileData, {
        onConflict: "id",
      })
      .select()

    if (error) {
      console.error("Error creating user profile:", error)
      throw error
    }

    console.log("Profile created successfully:", data)
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
      console.log("Profile not found, creating one...")
      return await createUserProfile(user)
    }

    console.log("Profile exists for user:", user.id)
    return existingProfile
  } catch (error) {
    console.error("Error ensuring user profile:", error)
    return null
  }
}

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

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
