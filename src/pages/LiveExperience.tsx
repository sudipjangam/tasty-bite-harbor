import React from "react";
import { SandboxProvider } from "@/components/LiveExperience/context/SandboxContext";
import { SandboxLayout } from "@/components/LiveExperience/layout/SandboxLayout";

export default function LiveExperience() {
  return (
    <SandboxProvider>
      <SandboxLayout />
    </SandboxProvider>
  );
}
