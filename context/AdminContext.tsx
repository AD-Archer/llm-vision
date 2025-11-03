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
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation: InvitationCode = {
      code,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    setInvitationCodes((prev) => [...prev, invitation]);
    return invitation;
  };

  const useInvitationCode = async (code: string, email: string) => {
    const invitation = invitationCodes.find((inv) => inv.code === code);

    if (!invitation) {
      return false;
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return false; // Expired
    }

    if (invitation.usedBy) {
      return false; // Already used
    }

    // Mark invitation as used and add user
    setInvitationCodes((prev) =>
      prev.map((inv) =>
        inv.code === code
          ? {
              ...inv,
              usedBy: email,
              usedAt: new Date().toISOString(),
            }
          : inv
      )
    );

    await addUser(email, email.split("@")[0]);
    return true;
  };

  const revokeInvitationCode = (code: string) => {
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
