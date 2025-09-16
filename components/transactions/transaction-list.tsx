"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { Receipt } from "@/components/icons/receipt"
import { formatCurrency } from "@/lib/currency" // Import currency formatting

interface Transaction {
  id: string
  amount: number
  original_amount: number // Added original amount
  currency: string // Added currency
  exchange_rate: number // Added exchange rate
  type: "income" | "expense"
  description: string | null
  date: string
  category: {
    name: string
    color: string
  }
}

interface TransactionListProps {
  refreshTrigger?: number
}

export function TransactionList({ refreshTrigger }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [userDefaultCurrency, setUserDefaultCurrency] = useState("USD") // Added user default currency

  useEffect(() => {
    fetchTransactions()
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

  const fetchTransactions = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          original_amount,
          currency,
          exchange_rate,
          type,
          description,
          date,
          category:categories(name, color)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("transactions").delete().eq("id", id)

      if (error) throw error
      fetchTransactions()
    } catch (error) {
      console.error("Error deleting transaction:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <Receipt className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
          <p>Start by adding your first transaction above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Original Amount</TableHead> {/* Updated header */}
            <TableHead className="text-right">Converted Amount</TableHead> {/* Added converted amount column */}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">{format(new Date(transaction.date), "MMM dd, yyyy")}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: transaction.category.color }} />
                  <span>{transaction.category.name}</span>
                </div>
              </TableCell>
              <TableCell>
                {transaction.description || <span className="text-gray-400 italic">No description</span>}
              </TableCell>
              <TableCell>
                <Badge
                  variant={transaction.type === "income" ? "default" : "secondary"}
                  className="flex items-center space-x-1 w-fit"
                >
                  {transaction.type === "income" ? (
                    <ArrowUpCircle className="h-3 w-3" />
                  ) : (
                    <ArrowDownCircle className="h-3 w-3" />
                  )}
                  <span className="capitalize">{transaction.type}</span>
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                <span className={transaction.type === "income" ? "text-green-600" : "text-red-600"}>
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(
                    transaction.original_amount || transaction.amount,
                    transaction.currency || userDefaultCurrency,
                  )}
                </span>
              </TableCell>
              <TableCell className="text-right font-medium">
                {transaction.currency !== userDefaultCurrency ? (
                  <div className="space-y-1">
                    <span className={transaction.type === "income" ? "text-green-600" : "text-red-600"}>
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount, userDefaultCurrency)}
                    </span>
                    <div className="text-xs text-gray-500">
                      Rate: {transaction.exchange_rate?.toFixed(4) || "1.0000"}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Same currency</span>
                )}
              </TableCell>
              <TableCell>
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
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(transaction.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
