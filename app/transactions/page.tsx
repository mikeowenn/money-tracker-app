"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { TransactionList } from "@/components/transactions/transaction-list"

export default function TransactionsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleTransactionSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your income and expense transactions.</p>
          </div>
          <TransactionForm onSuccess={handleTransactionSuccess} />
        </div>

        {/* Transaction List */}
        <TransactionList refreshTrigger={refreshTrigger} />
      </div>
    </DashboardLayout>
  )
}
