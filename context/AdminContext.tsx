"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { UserStats, UserFeatures, InvitationCode } from "../types";

export interface AdminContextType {
  users: UserStats[];
  userFeatures: Record<string, UserFeatures>;
  invitationCodes: InvitationCode[];
  totalUsers: number;
  activeUsers: number;
  totalQueries: number;

  // User management
  addUser: (email: string, name: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  resetPassword: (
    userId: string,
    newPassword: string,
    adminUserId: string
  ) => Promise<void>;
  updateUserQueryCount: (userId: string, count: number) => void;

  // Features management
  updateUserFeatures: (userId: string, features: Partial<UserFeatures>) => void;
  getUserFeatures: (userId: string) => UserFeatures;

  // Invitation management
  generateInvitationCode: () => Promise<InvitationCode>;
  useInvitationCode: (code: string, email: string) => Promise<boolean>;
  revokeInvitationCode: (code: string) => void;
  getInvitationCodes: () => InvitationCode[];
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const DEFAULT_FEATURES: UserFeatures = {
  userId: "",
  maxQueriesPerDay: 100,
  apiAccessEnabled: true,
  advancedChartsEnabled: true,
  customWebhooksEnabled: true,
};

export const AdminProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [userFeatures, setUserFeatures] = useState<
    Record<string, UserFeatures>
  >({});
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);

  // Initialize from localStorage
  useEffect(() => {
    const storedUsers = localStorage.getItem("llm-visi-admin-users");
    const storedFeatures = localStorage.getItem("llm-visi-admin-features");
    const storedInvitations = localStorage.getItem(
      "llm-visi-admin-invitations"
    );

    if (storedUsers) {
      try {
        setUsers(JSON.parse(storedUsers));
      } catch (e) {
        console.error("Failed to parse stored users", e);
      }
    }

    if (storedFeatures) {
      try {
        setUserFeatures(JSON.parse(storedFeatures));
      } catch (e) {
        console.error("Failed to parse stored features", e);
      }
    }

    if (storedInvitations) {
      try {
        setInvitationCodes(JSON.parse(storedInvitations));
      } catch (e) {
        console.error("Failed to parse stored invitations", e);
      }
    }
  }, []);

  // Initialize invitation codes from API
  useEffect(() => {
    const loadInvitationCodes = async () => {
      try {
        const response = await fetch("/api/admin/invitation-codes");
        if (response.ok) {
          const codes = await response.json();
          setInvitationCodes(codes);
        }
      } catch (error) {
        console.error("Failed to load invitation codes", error);
      }
    };

    loadInvitationCodes();
  }, []);

  // Initialize users from API
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/admin/users");
        if (response.ok) {
          const usersData = await response.json();
          setUsers(usersData);
        }
      } catch (error) {
        console.error("Failed to load users", error);
      }
    };

    loadUsers();
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("llm-visi-admin-users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(
      "llm-visi-admin-features",
      JSON.stringify(userFeatures)
    );
  }, [userFeatures]);

  useEffect(() => {
    localStorage.setItem(
      "llm-visi-admin-invitations",
      JSON.stringify(invitationCodes)
    );
  }, [invitationCodes]);

  const addUser = async (email: string, name: string) => {
    const newUser: UserStats = {
      id: `user-${Date.now()}`,
      email,
      name,
      queryCount: 0,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: "active",
    };

    setUsers((prev) => [...prev, newUser]);

    // Initialize features for new user
    const newFeatures: UserFeatures = {
      ...DEFAULT_FEATURES,
      userId: newUser.id,
    };
    setUserFeatures((prev) => ({
      ...prev,
      [newUser.id]: newFeatures,
    }));
  };

  const removeUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setUserFeatures((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  const resetPassword = async (
    userId: string,
    newPassword: string,
    adminUserId: string
  ) => {
    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, adminUserId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to reset password");
    }
  };

  const updateUserQueryCount = (userId: string, count: number) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, queryCount: count, lastActive: new Date().toISOString() }
          : u
      )
    );
  };

  const updateUserFeatures = (
    userId: string,
    features: Partial<UserFeatures>
  ) => {
    setUserFeatures((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...features,
      },
    }));
  };

  const getUserFeatures = (userId: string): UserFeatures => {
    return (
      userFeatures[userId] || {
        ...DEFAULT_FEATURES,
        userId,
      }
    );
  };

  const generateInvitationCode = async (): Promise<InvitationCode> => {
    const response = await fetch("/api/admin/invitation-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresInDays: 7 }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate invitation code");
    }

    const data = await response.json();
    setInvitationCodes((prev) => [...prev, data]);
    return data;
  };

  const useInvitationCode = async (_code: string, _email: string) => {
    // This is now handled in the registration API
    return true;
  };

  const revokeInvitationCode = async (code: string) => {
    const response = await fetch(`/api/admin/invitation-codes/${code}`, {
      method: "PATCH",
    });

    if (!response.ok) {
      throw new Error("Failed to revoke invitation code");
    }

    setInvitationCodes((prev) => prev.filter((inv) => inv.code !== code));
  };

  const getInvitationCodes = (): InvitationCode[] => {
    return invitationCodes;
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const totalQueries = users.reduce((sum, u) => sum + u.queryCount, 0);

  const value: AdminContextType = {
    users,
    userFeatures,
    invitationCodes,
    totalUsers,
    activeUsers,
    totalQueries,
    addUser,
    removeUser,
    resetPassword,
    updateUserQueryCount,
    updateUserFeatures,
    getUserFeatures,
    generateInvitationCode,
    useInvitationCode,
    revokeInvitationCode,
    getInvitationCodes,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
