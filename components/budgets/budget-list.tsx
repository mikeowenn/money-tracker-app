"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, AlertTriangle, CheckCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/currency" // Import currency formatting

interface BudgetAnalysis {
  budget_id: string
  category_id: string
  category_name: string
  category_color: string
  budget_amount: number
  actual_spent: number
  remaining: number
  percentage_used: number
  period: "monthly" | "yearly"
  year: number
  month: number | null
  currency?: string // Added currency field
}

interface BudgetListProps {
  refreshTrigger?: number
}

export function BudgetList({ refreshTrigger }: BudgetListProps) {
  const [budgets, setBudgets] = useState<BudgetAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [userDefaultCurrency, setUserDefaultCurrency] = useState("USD") // Added user default currency

  useEffect(() => {
    fetchBudgets()
    fetchUserProfile() // Fetch user profile for default currency
  }, [refreshTrigger])

  const fetchUserProfile = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data, error } = await supabase.from("profiles").select("default_currency").eq("id", user.id).single()

      if (data?.default_currency) {
        setUserDefaultCurrency(data.default_currency)
      }
    }
  }

  const fetchBudgets = async () => {
    try {
      const supabase = createClient()
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      const { data, error } = await supabase
        .from("budgets")
        .select(`
          id,
          category_id,
          amount,
          currency,
          period,
          year,
          month,
          categories!inner(name, color)
        `)
        .eq("year", currentYear)
        .or(`month.eq.${currentMonth},period.eq.yearly`)
        .order("categories(name)")

      if (error) throw error

      const transformedBudgets =
        data?.map((budget) => ({
          budget_id: budget.id,
          category_id: budget.category_id,
          category_name: budget.categories.name,
          category_color: budget.categories.color,
          budget_amount: budget.amount,
          currency: budget.currency || userDefaultCurrency,
          actual_spent: 0, // Will be calculated separately
          remaining: budget.amount,
          percentage_used: 0,
          period: budget.period,
          year: budget.year,
          month: budget.month,
        })) || []

      setBudgets(transformedBudgets)
    } catch (error) {
      console.error("Error fetching budgets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (budgetId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("budgets").delete().eq("id", budgetId)

      if (error) throw error
      fetchBudgets()
    } catch (error) {
      console.error("Error deleting budget:", error)
    }
  }

  const getStatusColor = (percentageUsed: number) => {
    if (percentageUsed <= 50) return "text-green-600"
    if (percentageUsed <= 80) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusIcon = (percentageUsed: number) => {
    if (percentageUsed <= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const formatPeriod = (budget: BudgetAnalysis) => {
    if (budget.period === "yearly") {
      return `${budget.year} (Yearly)`
    }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${monthNames[budget.month! - 1]} ${budget.year}`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (budgets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">No budgets set</h3>
          <p>Start by setting your first budget to track your spending.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {budgets.map((budget) => (
        <Card key={budget.budget_id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.category_color }} />
                <CardTitle className="text-lg">{budget.category_name}</CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(budget.budget_id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardDescription className="flex items-center justify-between">
              <span>{formatPeriod(budget)}</span>
              <Badge variant="outline" className="flex items-center space-x-1">
                {getStatusIcon(budget.percentage_used)}
                <span>{budget.percentage_used.toFixed(0)}%</span>
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Spent</span>
                <span className={getStatusColor(budget.percentage_used)}>
                  {formatCurrency(budget.actual_spent, budget.currency || userDefaultCurrency)} /{" "}
                  {formatCurrency(budget.budget_amount, budget.currency || userDefaultCurrency)}
                </span>
              </div>
              <Progress value={Math.min(budget.percentage_used, 100)} className="h-2" />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Remaining</span>
              <span className={budget.remaining >= 0 ? "text-green-600" : "text-red-600 font-medium"}>
                {formatCurrency(Math.abs(budget.remaining), budget.currency || userDefaultCurrency)}{" "}
                {budget.remaining < 0 ? "over" : "left"}
              </span>
            </div>
            {budget.currency && budget.currency !== userDefaultCurrency && (
              <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                Budget set in {budget.currency}. Spending comparisons use current exchange rates.
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
