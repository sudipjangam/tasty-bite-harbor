
import React from "react";
import { useAuthState } from "@/hooks/useAuthState";
import AuthLoader from "@/components/Auth/AuthLoader";
import ExpensesList from "@/components/Expenses/ExpensesList";

const Expenses = () => {
  const { user, loading } = useAuthState();

  if (loading) {
    return <AuthLoader />;
  }

  if (!user) {
    return <AuthLoader />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Expense Management
        </h1>
        <p className="text-muted-foreground">
          Track and analyze your business expenses
        </p>
      </div>
      <ExpensesList />
    </div>
  );
};

export default Expenses;
