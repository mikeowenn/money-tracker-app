"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useRouter } from "next/navigation"

export function CurrencySettings() {
  const [defaultCurrency, setDefaultCurrency] = useState("USD")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase.from("profiles").select("default_currency").eq("id", user.id).single()

        if (data?.default_currency) {
          setDefaultCurrency(data.default_currency)
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ default_currency: defaultCurrency })
          .eq("id", user.id)

        if (error) throw error

        router.refresh()
      }
    } catch (error) {
      console.error("Error updating currency:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Settings</CardTitle>
        <CardDescription>
          Set your default currency for budgeting and reporting. Transactions in other currencies will be automatically
          converted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="default-currency">Default Currency</Label>
          <CurrencySelector
            value={defaultCurrency}
            onValueChange={setDefaultCurrency}
            placeholder="Select your default currency"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <strong>Note:</strong> All budgets and analytics will be calculated in your default currency. Exchange rates
            are fetched automatically when you add transactions in different currencies.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? "Saving..." : "Save Currency Settings"}
        </Button>
      </CardContent>
    </Card>
  )
}
