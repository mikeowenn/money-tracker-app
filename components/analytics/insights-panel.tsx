"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Calendar } from "lucide-react"

interface Insight {
  type: "success" | "warning" | "info" | "error"
  title: string
  description: string
  icon: React.ReactNode
}

interface AnalyticsData {
  currentMonthSpending: number
  lastMonthSpending: number
  topSpendingCategory: { name: string; amount: number; color: string } | null
  budgetOverruns: number
  savingsRate: number
  highestSpendingMonth: { month: string; amount: number } | null
}

export function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateInsights()
  }, [])

  const generateInsights = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear

      // Get current and last month summaries
      const [currentMonthResult, lastMonthResult] = await Promise.all([
        supabase.rpc("get_monthly_summary", {
          p_user_id: user.id,
          p_year: currentYear,
          p_month: currentMonth,
        }),
        supabase.rpc("get_monthly_summary", {
          p_user_id: user.id,
          p_year: lastMonthYear,
          p_month: lastMonth,
        }),
      ])

      const currentMonthData = currentMonthResult.data?.[0] || { total_income: 0, total_expenses: 0 }
      const lastMonthData = lastMonthResult.data?.[0] || { total_income: 0, total_expenses: 0 }

      // Get top spending category this month
      const { data: topCategory } = await supabase
        .from("transaction_summaries")
        .select("category_name, category_color, total_amount")
        .eq("type", "expense")
        .eq("year", currentYear)
        .eq("month_num", currentMonth)
        .order("total_amount", { ascending: false })
        .limit(1)

      // Get budget overruns
      const { data: budgetOverruns } = await supabase
        .from("budget_analysis")
        .select("*")
        .eq("year", currentYear)
        .eq("month", currentMonth)
        .gt("percentage_used", 100)

      // Get last 12 months for highest spending month
      const monthlyPromises = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth() + 1

        monthlyPromises.push(
          supabase
            .rpc("get_monthly_summary", {
              p_user_id: user.id,
              p_year: year,
              p_month: month,
            })
            .then((result) => ({
              month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
              amount: Number(result.data?.[0]?.total_expenses) || 0,
            })),
        )
      }

      const monthlyResults = await Promise.all(monthlyPromises)
      const highestSpendingMonth = monthlyResults.reduce((max, current) =>
        current.amount > max.amount ? current : max,
      )

      const analyticsData: AnalyticsData = {
        currentMonthSpending: Number(currentMonthData.total_expenses) || 0,
        lastMonthSpending: Number(lastMonthData.total_expenses) || 0,
        topSpendingCategory: topCategory?.[0]
          ? {
              name: topCategory[0].category_name,
              amount: topCategory[0].total_amount,
              color: topCategory[0].category_color,
            }
          : null,
        budgetOverruns: budgetOverruns?.length || 0,
        savingsRate:
          Number(currentMonthData.total_income) > 0
            ? ((Number(currentMonthData.total_income) - Number(currentMonthData.total_expenses)) /
                Number(currentMonthData.total_income)) *
              100
            : 0,
        highestSpendingMonth: highestSpendingMonth.amount > 0 ? highestSpendingMonth : null,
      }

      const generatedInsights = generateInsightsFromData(analyticsData)
      setInsights(generatedInsights)
    } catch (error) {
      console.error("Error generating insights:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateInsightsFromData = (data: AnalyticsData): Insight[] => {
    const insights: Insight[] = []

    // Spending trend insight
    if (data.currentMonthSpending > 0 && data.lastMonthSpending > 0) {
      const spendingChange = ((data.currentMonthSpending - data.lastMonthSpending) / data.lastMonthSpending) * 100
      if (spendingChange > 10) {
        insights.push({
          type: "warning",
          title: "Spending Increased",
          description: `Your spending increased by ${spendingChange.toFixed(1)}% compared to last month.`,
          icon: <TrendingUp className="h-4 w-4" />,
        })
      } else if (spendingChange < -10) {
        insights.push({
          type: "success",
          title: "Great Job Saving!",
          description: `You reduced spending by ${Math.abs(spendingChange).toFixed(1)}% compared to last month.`,
          icon: <TrendingDown className="h-4 w-4" />,
        })
      }
    }

    // Top spending category
    if (data.topSpendingCategory) {
      insights.push({
        type: "info",
        title: "Top Spending Category",
        description: `You spent the most on ${data.topSpendingCategory.name} ($${data.topSpendingCategory.amount.toFixed(2)}) this month.`,
        icon: <Target className="h-4 w-4" />,
      })
    }

    // Budget overruns
    if (data.budgetOverruns > 0) {
      insights.push({
        type: "error",
        title: "Budget Alert",
        description: `You've exceeded your budget in ${data.budgetOverruns} ${data.budgetOverruns === 1 ? "category" : "categories"} this month.`,
        icon: <AlertTriangle className="h-4 w-4" />,
      })
    } else if (data.budgetOverruns === 0) {
      insights.push({
        type: "success",
        title: "On Track",
        description: "You're staying within all your budgets this month. Keep it up!",
        icon: <CheckCircle className="h-4 w-4" />,
      })
    }

    // Savings rate
    if (data.savingsRate > 20) {
      insights.push({
        type: "success",
        title: "Excellent Savings Rate",
        description: `You're saving ${data.savingsRate.toFixed(1)}% of your income this month.`,
        icon: <TrendingUp className="h-4 w-4" />,
      })
    } else if (data.savingsRate < 0) {
      insights.push({
        type: "warning",
        title: "Spending More Than Earning",
        description: "Your expenses exceed your income this month. Consider reviewing your spending.",
        icon: <AlertTriangle className="h-4 w-4" />,
      })
    }

    // Highest spending month
    if (data.highestSpendingMonth) {
      insights.push({
        type: "info",
        title: "Highest Spending Period",
        description: `Your highest spending month was ${data.highestSpendingMonth.month} with $${data.highestSpendingMonth.amount.toFixed(2)}.`,
        icon: <Calendar className="h-4 w-4" />,
      })
    }

    return insights
  }

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
      case "warning":
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
      case "error":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      default:
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
    }
  }

  const getInsightBadgeColor = (type: Insight["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Insights</CardTitle>
          <CardDescription>AI-powered analysis of your spending patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Insights</CardTitle>
        <CardDescription>AI-powered analysis of your spending patterns</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className={getInsightBadgeColor(insight.type)}>
                      {insight.icon}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{insight.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Add more transactions to get personalized insights about your spending patterns.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
