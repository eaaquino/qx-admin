import { AccessControlProvider } from "@refinedev/core";
import { supabaseClient } from "./utility";

// Cache the admin role to avoid repeated DB calls
let cachedRole: string | null = null;
let cachedUserId: string | null = null;

async function getAdminRole(): Promise<string | null> {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    cachedRole = null;
    cachedUserId = null;
    return null;
  }

  // Return cached role if user hasn't changed
  if (cachedUserId === user.id && cachedRole) {
    return cachedRole;
  }

  const { data: adminData } = await supabaseClient
    .from("admins")
    .select("role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  cachedRole = adminData?.role || null;
  cachedUserId = user.id;
  return cachedRole;
}

// Clear cache on logout
export function clearRoleCache() {
  cachedRole = null;
  cachedUserId = null;
}

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const role = await getAdminRole();

    if (!role) {
      return { can: false, reason: "Not authenticated" };
    }

    // Super admin can do everything
    if (role === "super_admin") {
      return { can: true };
    }

    // Admin users resource - only super_admin can access
    if (resource === "admins") {
      return {
        can: false,
        reason: "Only super admins can manage admin users"
      };
    }

    // Viewer role - read only
    if (role === "viewer") {
      const readOnlyActions = ["list", "show"];
      if (readOnlyActions.includes(action)) {
        return { can: true };
      }
      return {
        can: false,
        reason: "Viewers have read-only access"
      };
    }

    // Admin role - can do everything except manage admins (handled above)
    if (role === "admin") {
      return { can: true };
    }

    return { can: false };
  },
};
