"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CurrencySettings } from "@/components/settings/currency-settings"

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account preferences and application settings.</p>
        </div>

        <CurrencySettings />
      </div>
    </DashboardLayout>
  )
}
