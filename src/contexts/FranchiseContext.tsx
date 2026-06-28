import React, { createContext, useContext, useState, ReactNode } from "react";
import { MOCK_BRANCHES, MOCK_ORG, MockBranch, OrgRole } from "@/data/franchiseMockData";

// ============================================================
// FranchiseContext — Provides org/branch state across franchise pages
// Uses mock data only — no Supabase queries.
// Wire up to real DB later by swapping mock values.
// ============================================================

interface FranchiseContextType {
  // Organization
  org: typeof MOCK_ORG;
  orgRole: OrgRole;
  isFranchiseOwner: boolean; // Mock flag — set to true to see franchise UI

  // Branches
  allBranches: MockBranch[];
  currentBranch: MockBranch | null; // null = "All Branches"
  setCurrentBranch: (branch: MockBranch | null) => void;

  // Helpers
  isAllBranches: boolean;
  currentBranchLabel: string;
}

const FranchiseContext = createContext<FranchiseContextType | undefined>(undefined);

interface FranchiseProviderProps {
  children: ReactNode;
}

export const FranchiseProvider: React.FC<FranchiseProviderProps> = ({ children }) => {
  const [currentBranch, setCurrentBranch] = useState<MockBranch | null>(null);

  // MOCK: Toggle this to true to simulate being a franchise owner
  // In production, this comes from organization_members.role
  const isFranchiseOwner = true;
  const orgRole: OrgRole = "owner";

  const value: FranchiseContextType = {
    org: MOCK_ORG,
    orgRole,
    isFranchiseOwner,
    allBranches: MOCK_BRANCHES,
    currentBranch,
    setCurrentBranch,
    isAllBranches: currentBranch === null,
    currentBranchLabel: currentBranch ? currentBranch.name : "All Branches",
  };

  return (
    <FranchiseContext.Provider value={value}>
      {children}
    </FranchiseContext.Provider>
  );
};

export const useFranchise = (): FranchiseContextType => {
  const ctx = useContext(FranchiseContext);
  if (!ctx) throw new Error("useFranchise must be used inside FranchiseProvider");
  return ctx;
};
