-- Create view for transaction summaries
CREATE OR REPLACE VIEW public.transaction_summaries AS
SELECT 
  t.user_id,
  t.type,
  c.name as category_name,
  c.color as category_color,
  DATE_TRUNC('month', t.date) as month,
  EXTRACT(year FROM t.date) as year,
  EXTRACT(month FROM t.date) as month_num,
  COUNT(*) as transaction_count,
  SUM(t.amount) as total_amount
FROM public.transactions t
JOIN public.categories c ON t.category_id = c.id
GROUP BY t.user_id, t.type, c.name, c.color, DATE_TRUNC('month', t.date), EXTRACT(year FROM t.date), EXTRACT(month FROM t.date);

-- Create view for budget vs actual spending
CREATE OR REPLACE VIEW public.budget_analysis AS
SELECT 
  b.user_id,
  b.id as budget_id,
  b.category_id,
  c.name as category_name,
  c.color as category_color,
  b.amount as budget_amount,
  b.period,
  b.year,
  b.month,
  COALESCE(actual.spent, 0) as actual_spent,
  (b.amount - COALESCE(actual.spent, 0)) as remaining,
  CASE 
    WHEN b.amount > 0 THEN (COALESCE(actual.spent, 0) / b.amount * 100)
    ELSE 0 
  END as percentage_used
FROM public.budgets b
JOIN public.categories c ON b.category_id = c.id
LEFT JOIN (
  SELECT 
    t.user_id,
    t.category_id,
    EXTRACT(year FROM t.date) as year,
    EXTRACT(month FROM t.date) as month,
    SUM(t.amount) as spent
  FROM public.transactions t
  WHERE t.type = 'expense'
  GROUP BY t.user_id, t.category_id, EXTRACT(year FROM t.date), EXTRACT(month FROM t.date)
) actual ON b.user_id = actual.user_id 
  AND b.category_id = actual.category_id 
  AND b.year = actual.year 
  AND (b.period = 'yearly' OR b.month = actual.month);

-- Function to get monthly summary for a user
CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  total_income DECIMAL(12,2),
  total_expenses DECIMAL(12,2),
  net_amount DECIMAL(12,2),
  transaction_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_amount,
    COUNT(*)::INTEGER as transaction_count
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND EXTRACT(year FROM t.date) = p_year
    AND EXTRACT(month FROM t.date) = p_month;
END;
$$;
