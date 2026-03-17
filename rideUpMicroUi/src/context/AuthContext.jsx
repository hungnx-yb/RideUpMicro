import { createContext, useMemo, useState } from "react";
import { loginApi, logoutApi, registerApi } from "../services/authApi";

export const AuthContext = createContext(null);

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";
const AUTH_REFRESH_TOKEN_KEY = "auth_refresh_token";
const ACTIVE_ROLE_KEY = "active_role";

function normalizeRoles(user) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function getDefaultRole(user, preferredRole) {
  const roles = normalizeRoles(user);
  if (!roles.length) {
    return null;
  }

  if (preferredRole && roles.includes(preferredRole)) {
    return preferredRole;
  }

  if (roles.includes("CUSTOMER")) {
    return "CUSTOMER";
  }

  return roles[0];
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(AUTH_REFRESH_TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activeRole, setActiveRole] = useState(() => {
    const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    return getDefaultRole(parsedUser, savedRole);
  });

  const clearAuth = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setActiveRole(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_ROLE_KEY);
  };

  const login = async (credentials) => {
    const authResult = await loginApi(credentials);
    const nextToken = authResult?.token;
    const nextRefreshToken = authResult?.refreshToken;
    const nextUser = authResult?.user;
    const nextRole = getDefaultRole(nextUser, localStorage.getItem(ACTIVE_ROLE_KEY));

    setToken(nextToken);
    setRefreshToken(nextRefreshToken);
    setUser(nextUser);
    setActiveRole(nextRole);
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, nextRefreshToken || "");
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser || null));
    if (nextRole) {
      localStorage.setItem(ACTIVE_ROLE_KEY, nextRole);
    }

    return authResult;
  };

  const register = async (payload) => {
    return registerApi(payload);
  };

  const switchRole = (role) => {
    const roles = normalizeRoles(user);
    if (!roles.includes(role)) {
      return;
    }

    setActiveRole(role);
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
  };

  const addRole = (role) => {
    if (!role) {
      return;
    }

    const currentRoles = normalizeRoles(user);
    if (currentRoles.includes(role)) {
      return;
    }

    const nextUser = {
      ...(user || {}),
      roles: [...currentRoles, role],
    };

    setUser(nextUser);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
  };

  const logout = async () => {
    if (token && refreshToken) {
      try {
        await logoutApi({ token, refreshToken });
      } catch {
        // Clear local auth state even if server logout fails.
      }
    }

    clearAuth();
  };

  const value = useMemo(
    () => ({
      token,
      refreshToken,
      user,
      roles: normalizeRoles(user),
      activeRole,
      isAuthenticated: Boolean(token),
      login,
      register,
      switchRole,
      addRole,
      logout,
    }),
    [token, refreshToken, user, activeRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
