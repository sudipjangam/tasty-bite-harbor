-- Migration: Atomic Wallet RPC + Idempotency Guard
-- Fixes: race conditions, double deductions, duplicate recharge credits
-- Created at: 2026-07-26 14:56:00

-- 1. Create atomic RPC for all wallet balance operations
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  p_restaurant_id UUID,
  p_amount NUMERIC,
  p_type TEXT,  -- 'deposit', 'deduction', 'refund'
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- For deposits: check idempotency via reference_id
  IF p_type = 'deposit' AND p_reference_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.wallet_transactions
      WHERE reference_id = p_reference_id
      AND restaurant_id = p_restaurant_id
    ) THEN
      -- Already processed this payment, return current balance
      SELECT balance INTO v_new_balance
      FROM public.restaurant_wallets
      WHERE restaurant_id = p_restaurant_id;
      RETURN v_new_balance;
    END IF;
  END IF;

  -- Atomic update with implicit row-level lock (UPDATE acquires FOR UPDATE lock)
  -- For deductions (negative p_amount): ensure balance won't go below 0
  UPDATE public.restaurant_wallets
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE restaurant_id = p_restaurant_id
    AND (p_amount > 0 OR balance + p_amount >= 0)
  RETURNING balance INTO v_new_balance;

  -- If no row updated: either wallet not found or insufficient balance
  IF v_new_balance IS NULL THEN
    IF p_amount < 0 THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    ELSE
      RAISE EXCEPTION 'Wallet not found for restaurant %', p_restaurant_id;
    END IF;
  END IF;

  -- Log the transaction in the same transaction (atomic with balance update)
  INSERT INTO public.wallet_transactions (
    restaurant_id, amount, transaction_type, description, reference_id
  ) VALUES (
    p_restaurant_id, p_amount, p_type, p_description, p_reference_id
  );

  RETURN v_new_balance;
END;
$$;

-- Grant execute to service_role (edge functions use this)
GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance TO service_role;
-- Also grant to authenticated in case needed for direct RPC calls
GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance TO authenticated;

-- 2. Add unique index on reference_id to enforce idempotency at DB level
-- This prevents the same Razorpay payment from being credited twice even under race conditions
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_reference_id_unique
ON public.wallet_transactions (restaurant_id, reference_id)
WHERE reference_id IS NOT NULL;
