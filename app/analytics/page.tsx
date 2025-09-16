import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SpendingChart } from "@/components/analytics/spending-chart"
import { InsightsPanel } from "@/components/analytics/insights-panel"

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gain insights into your spending patterns and financial health.
          </p>
        </div>

        {/* Charts */}
        <SpendingChart />

        {/* Insights */}
        <InsightsPanel />
      </div>
    </DashboardLayout>
  )
}
