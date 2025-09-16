"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "@/hooks/use-toast"
import { CategoryForm } from "./category-form"
import { Pencil, Trash2, Plus } from "lucide-react"

interface Category {
  id: string
  name: string
  type: "income" | "expense"
  color: string
  icon: string
  is_default: boolean
}

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showForm, setShowForm] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchCategories = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error: any) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId)

      if (error) throw error

      toast({ title: "Category deleted successfully!" })
      fetchCategories()
    } catch (error: any) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingCategory(null)
    fetchCategories()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingCategory(null)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  if (showForm || editingCategory) {
    return (
      <CategoryForm category={editingCategory || undefined} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Categories</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading categories...</div>
      ) : (
        <div className="grid gap-4">
          {["expense", "income"].map((type) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="capitalize">{type} Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {categories
                    .filter((cat) => cat.type === type)
                    .map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="font-medium">{category.name}</span>
                          {category.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingCategory(category)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {!category.is_default && (
                            <Button size="sm" variant="outline" onClick={() => deleteCategory(category.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
