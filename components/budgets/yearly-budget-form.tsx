"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { Calendar } from "lucide-react"
import { useRouter } from "next/navigation"

interface Category {
  id: string
  name: string
  type: "income" | "expense"
  color: string
}

interface MonthlyBudget {
  month: number
  amount: string
}

interface YearlyBudgetFormProps {
  onSuccess?: () => void
}

export function YearlyBudgetForm({ onSuccess }: YearlyBudgetFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>(
    Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: "" })),
  )
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("categories").select("*").eq("type", "expense").order("name")

    if (error) {
      console.error("Error fetching categories:", error)
    } else {
      setCategories(data || [])
    }
  }

  const handleAmountChange = (month: number, amount: string) => {
    setMonthlyBudgets((prev) => prev.map((budget) => (budget.month === month ? { ...budget, amount } : budget)))
  }

  const fillAllMonths = () => {
    const firstAmount = monthlyBudgets[0].amount
    if (firstAmount) {
      setMonthlyBudgets((prev) => prev.map((budget) => ({ ...budget, amount: firstAmount })))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Prepare budget data for all months
      const budgetData = monthlyBudgets
        .filter((budget) => budget.amount && Number.parseFloat(budget.amount) > 0)
        .map((budget) => ({
          user_id: user.id,
          category_id: selectedCategory,
          amount: Number.parseFloat(budget.amount),
          period: "monthly" as const,
          year: selectedYear,
          month: budget.month,
        }))

      if (budgetData.length === 0) {
        throw new Error("Please set at least one monthly budget amount")
      }

      // Delete existing budgets for this category/year combination
      await supabase
        .from("budgets")
        .delete()
        .eq("user_id", user.id)
        .eq("category_id", selectedCategory)
        .eq("year", selectedYear)
        .eq("period", "monthly")

      // Insert new budgets
      const { error } = await supabase.from("budgets").insert(budgetData)

      if (error) throw error

      // Reset form
      setSelectedCategory("")
      setSelectedYear(new Date().getFullYear())
      setMonthlyBudgets(Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: "" })))

      setOpen(false)
      onSuccess?.()
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear - 1; i <= currentYear + 2; i++) {
      years.push(i)
    }
    return years
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const totalBudget = monthlyBudgets.reduce((sum, budget) => {
    const amount = Number.parseFloat(budget.amount) || 0
    return sum + amount
  }, 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Set Yearly Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Yearly Budget</DialogTitle>
          <DialogDescription>Set monthly budgets for an entire year for a specific category.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateYearOptions().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Monthly Budgets</Label>
              <Button type="button" variant="outline" size="sm" onClick={fillAllMonths}>
                Fill All with First Amount
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Budget Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyBudgets.map((budget) => (
                    <TableRow key={budget.month}>
                      <TableCell className="font-medium">{monthNames[budget.month - 1]}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={budget.amount}
                          onChange={(e) => handleAmountChange(budget.month, e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalBudget > 0 && (
              <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                Total yearly budget: <span className="font-medium">${totalBudget.toFixed(2)}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Yearly Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
