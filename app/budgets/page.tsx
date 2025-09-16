"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BudgetForm } from "@/components/budgets/budget-form"
import { BudgetList } from "@/components/budgets/budget-list"
import { YearlyBudgetForm } from "@/components/budgets/yearly-budget-form"

export default function BudgetsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleBudgetSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budgets</h1>
            <p className="text-gray-600 dark:text-gray-400">Set and track your spending budgets by category.</p>
          </div>
          <div className="flex space-x-2">
            <YearlyBudgetForm onSuccess={handleBudgetSuccess} />
            <BudgetForm onSuccess={handleBudgetSuccess} />
          </div>
        </div>

        {/* Budget List */}
        <BudgetList refreshTrigger={refreshTrigger} />
      </div>
    </DashboardLayout>
  )
}
