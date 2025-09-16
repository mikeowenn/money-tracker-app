-- Add currency support to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12,2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1.0;

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Create exchange rates table for currency conversion
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, date)
);

-- Enable RLS on exchange_rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for exchange_rates (read-only for all authenticated users)
CREATE POLICY "exchange_rates_select_all" ON public.exchange_rates FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies_date ON public.exchange_rates(from_currency, to_currency, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON public.transactions(currency);
CREATE INDEX IF NOT EXISTS idx_budgets_currency ON public.budgets(currency);

-- Update existing transactions to have currency and original_amount
UPDATE public.transactions 
SET currency = 'USD', original_amount = amount, exchange_rate = 1.0 
WHERE currency IS NULL;

-- Update existing budgets to have currency
UPDATE public.budgets 
SET currency = 'USD' 
WHERE currency IS NULL;

-- Function to get latest exchange rate
CREATE OR REPLACE FUNCTION public.get_exchange_rate(
  p_from_currency VARCHAR(3),
  p_to_currency VARCHAR(3)
)
RETURNS DECIMAL(10,6)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate DECIMAL(10,6);
BEGIN
  -- If same currency, return 1
  IF p_from_currency = p_to_currency THEN
    RETURN 1.0;
  END IF;
  
  -- Get latest rate
  SELECT rate INTO v_rate
  FROM public.exchange_rates
  WHERE from_currency = p_from_currency 
    AND to_currency = p_to_currency
  ORDER BY date DESC, created_at DESC
  LIMIT 1;
  
  -- If no rate found, try reverse rate
  IF v_rate IS NULL THEN
    SELECT (1.0 / rate) INTO v_rate
    FROM public.exchange_rates
    WHERE from_currency = p_to_currency 
      AND to_currency = p_from_currency
    ORDER BY date DESC, created_at DESC
    LIMIT 1;
  END IF;
  
  -- Return rate or 1.0 if not found
  RETURN COALESCE(v_rate, 1.0);
END;
$$;
