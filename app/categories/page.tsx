import { CategoryList } from "@/components/categories/category-list"
import DashboardLayout from "@/components/layout/dashboard-layout"

export default function CategoriesPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <CategoryList />
      </div>
    </DashboardLayout>
  )
}
