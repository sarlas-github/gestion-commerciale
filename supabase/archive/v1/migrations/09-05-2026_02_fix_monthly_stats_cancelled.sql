-- ══════════════════════════════════════════════════════════════════════════════
-- Migration : Exclure les transactions annulées des stats mensuelles
-- get_client_monthly_stats() et get_supplier_monthly_stats()
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_client_monthly_stats(
  p_client_id uuid,
  p_year      int,
  p_month     int
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled  CONSTANT text := 'cancelled';
  v_start      date;
  v_end        date;
  v_result     json;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;

  SELECT json_build_object(
    'totalVentes', COALESCE(SUM(total),     0),
    'totalPaye',   COALESCE(SUM(paid),      0),
    'resteAPayer', COALESCE(SUM(remaining), 0)
  )
  INTO v_result
  FROM sales
  WHERE user_id   = auth.uid()
    AND client_id = p_client_id
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  RETURN v_result;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_supplier_monthly_stats(
  p_supplier_id uuid,
  p_year        int,
  p_month       int
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled  CONSTANT text := 'cancelled';
  v_start      date;
  v_end        date;
  v_result     json;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;

  SELECT json_build_object(
    'totalAchats', COALESCE(SUM(total),     0),
    'totalPaye',   COALESCE(SUM(paid),      0),
    'resteAPayer', COALESCE(SUM(remaining), 0)
  )
  INTO v_result
  FROM purchases
  WHERE user_id     = auth.uid()
    AND supplier_id = p_supplier_id
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  RETURN v_result;
END;
$$;
