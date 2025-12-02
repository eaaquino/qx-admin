import { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "./utility";

// Helper function to check if user is an active admin
async function checkAdminStatus(userId: string): Promise<{ isAdmin: boolean; adminData: any | null }> {
  const { data, error } = await supabaseClient
    .from("admins")
    .select("*")
    .eq("auth_user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return { isAdmin: false, adminData: null };
  }

  return { isAdmin: true, adminData: data };
}

const authProvider: AuthProvider = {
  login: async ({ email, password, providerName }) => {
    // sign in with oauth
    try {
      if (providerName) {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
          provider: providerName,
        });

        if (error) {
          return {
            success: false,
            error,
          };
        }

        if (data?.url) {
          return {
            success: true,
            redirectTo: "/",
          };
        }
      }

      // sign in with email and password
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error,
        };
      }

      if (data?.user) {
        // Check if user is an active admin
        const { isAdmin, adminData } = await checkAdminStatus(data.user.id);

        if (!isAdmin) {
          // Sign out the non-admin user
          await supabaseClient.auth.signOut();
          return {
            success: false,
            error: {
              message: "Access denied",
              name: "You do not have admin access to this application",
            },
          };
        }

        // Update last_login timestamp
        await supabaseClient
          .from("admins")
          .update({ last_login: new Date().toISOString() })
          .eq("id", adminData.id);

        return {
          success: true,
          redirectTo: "/",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: false,
      error: {
        message: "Login failed",
        name: "Invalid email or password",
      },
    };
  },
  register: async ({ email, password }) => {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error,
        };
      }

      if (data) {
        return {
          success: true,
          redirectTo: "/",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: false,
      error: {
        message: "Register failed",
        name: "Invalid email or password",
      },
    };
  },
  forgotPassword: async ({ email }) => {
    try {
      const { data, error } = await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/update-password`,
        }
      );

      if (error) {
        return {
          success: false,
          error,
        };
      }

      if (data) {
        return {
          success: true,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: false,
      error: {
        message: "Forgot password failed",
        name: "Invalid email",
      },
    };
  },
  updatePassword: async ({ password }) => {
    try {
      const { data, error } = await supabaseClient.auth.updateUser({
        password,
      });

      if (error) {
        return {
          success: false,
          error,
        };
      }

      if (data) {
        return {
          success: true,
          redirectTo: "/",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error,
      };
    }
    return {
      success: false,
      error: {
        message: "Update password failed",
        name: "Invalid password",
      },
    };
  },
  logout: async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },
  onError: async (error) => {
    console.error(error);
    return { error };
  },
  check: async () => {
    try {
      const { data } = await supabaseClient.auth.getSession();
      const { session } = data;

      if (!session) {
        return {
          authenticated: false,
          error: {
            message: "Check failed",
            name: "Session not found",
          },
          logout: true,
          redirectTo: "/login",
        };
      }

      // Verify user is still an active admin
      const { isAdmin } = await checkAdminStatus(session.user.id);
      if (!isAdmin) {
        await supabaseClient.auth.signOut();
        return {
          authenticated: false,
          error: {
            message: "Access denied",
            name: "You do not have admin access to this application",
          },
          logout: true,
          redirectTo: "/login",
        };
      }
    } catch (error: any) {
      return {
        authenticated: false,
        error: error || {
          message: "Check failed",
          name: "Not authenticated",
        },
        logout: true,
        redirectTo: "/login",
      };
    }

    return {
      authenticated: true,
    };
  },
  getPermissions: async () => {
    const user = await supabaseClient.auth.getUser();

    if (user) {
      return user.data.user?.role;
    }

    return null;
  },
  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getUser();

    if (data?.user) {
      // Get admin profile data
      const { adminData } = await checkAdminStatus(data.user.id);

      if (adminData) {
        return {
          ...data.user,
          name: `${adminData.first_name} ${adminData.last_name}`.trim() || data.user.email,
          avatar: adminData.profile_photo_url,
          role: adminData.role,
        };
      }

      return {
        ...data.user,
        name: data.user.email,
      };
    }

    return null;
  },
};

export default authProvider;
