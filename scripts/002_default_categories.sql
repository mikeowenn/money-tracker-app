-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Default expense categories
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default) VALUES
    (user_id, 'Food & Dining', 'expense', '#EF4444', 'UtensilsCrossed', true),
    (user_id, 'Transportation', 'expense', '#3B82F6', 'Car', true),
    (user_id, 'Shopping', 'expense', '#8B5CF6', 'ShoppingBag', true),
    (user_id, 'Entertainment', 'expense', '#F59E0B', 'Gamepad2', true),
    (user_id, 'Bills & Utilities', 'expense', '#10B981', 'Receipt', true),
    (user_id, 'Healthcare', 'expense', '#EC4899', 'Heart', true),
    (user_id, 'Education', 'expense', '#6366F1', 'GraduationCap', true),
    (user_id, 'Other Expenses', 'expense', '#6B7280', 'MoreHorizontal', true);

  -- Default income categories
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default) VALUES
    (user_id, 'Salary', 'income', '#059669', 'Briefcase', true),
    (user_id, 'Freelance', 'income', '#0891B2', 'Laptop', true),
    (user_id, 'Investment', 'income', '#7C3AED', 'TrendingUp', true),
    (user_id, 'Other Income', 'income', '#059669', 'Plus', true);
END;
$$;

-- Trigger function to create profile and default categories on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default categories
  PERFORM create_default_categories(NEW.id);

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
