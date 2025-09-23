-- Function to import budget data from JSON
-- This function processes JSON data and inserts income/expense entries
-- It handles category mapping and prevents duplicates

CREATE OR REPLACE FUNCTION import_budget_from_json(
  budget_json JSONB
) RETURNS JSONB AS $$
DECLARE
  current_user_id UUID;
  income_inserted INTEGER := 0;
  expense_inserted INTEGER := 0;
  year_value INTEGER;
  result JSONB;
BEGIN
  -- Get current user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Extract year from JSON
  year_value := (budget_json ->> 'year')::INTEGER;

  IF year_value IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Year is required in JSON'
    );
  END IF;

  -- Insert income entries
  INSERT INTO public.income_entries (id, user_id, category_id, year, month, amount, description)
  SELECT
    gen_random_uuid(),
    current_user_id,
    ic.id,
    year_value,
    m.k::INTEGER,
    m.v::NUMERIC,
    NULLIF(TRIM(COALESCE(val ->> 'description', '')), '')
  FROM jsonb_array_elements(COALESCE(budget_json -> 'incomes', '[]'::jsonb)) AS val
  JOIN public.income_categories ic ON ic.user_id = current_user_id
    AND UPPER(ic.name) = TRIM(UPPER(COALESCE(val ->> 'map_to', val ->> 'category')))
  CROSS JOIN LATERAL jsonb_each_text(COALESCE(val -> 'monthly', '{}'::jsonb)) AS m(k, v)
  WHERE COALESCE(m.v::NUMERIC, 0) <> 0
    AND NOT EXISTS (
      SELECT 1 FROM public.income_entries e
      WHERE e.user_id = current_user_id
        AND e.category_id = ic.id
        AND e.year = year_value
        AND e.month = m.k::INTEGER
        AND e.amount = m.v::NUMERIC
        AND COALESCE(e.description, '') = COALESCE(NULLIF(TRIM(COALESCE(val ->> 'description', '')), ''), '')
    );

  GET DIAGNOSTICS income_inserted = ROW_COUNT;

  -- Insert expense entries
  INSERT INTO public.expense_entries (id, user_id, category_id, year, month, amount, description)
  SELECT
    gen_random_uuid(),
    current_user_id,
    ec.id,
    year_value,
    m.k::INTEGER,
    m.v::NUMERIC,
    NULLIF(TRIM(COALESCE(val ->> 'description', '')), '')
  FROM jsonb_array_elements(COALESCE(budget_json -> 'expenses', '[]'::jsonb)) AS val
  JOIN public.expense_categories ec ON ec.user_id = current_user_id
    AND UPPER(ec.name) = TRIM(UPPER(COALESCE(val ->> 'map_to', val ->> 'category')))
  CROSS JOIN LATERAL jsonb_each_text(COALESCE(val -> 'monthly', '{}'::jsonb)) AS m(k, v)
  WHERE COALESCE(m.v::NUMERIC, 0) <> 0
    AND NOT EXISTS (
      SELECT 1 FROM public.expense_entries e
      WHERE e.user_id = current_user_id
        AND e.category_id = ec.id
        AND e.year = year_value
        AND e.month = m.k::INTEGER
        AND e.amount = m.v::NUMERIC
        AND COALESCE(e.description, '') = COALESCE(NULLIF(TRIM(COALESCE(val ->> 'description', '')), ''), '')
    );

  GET DIAGNOSTICS expense_inserted = ROW_COUNT;

  -- Return results
  result := jsonb_build_object(
    'success', true,
    'message', 'Budget data imported successfully',
    'data', jsonb_build_object(
      'year', year_value,
      'income_entries_created', income_inserted,
      'expense_entries_created', expense_inserted,
      'total_entries_created', income_inserted + expense_inserted
    )
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION import_budget_from_json(JSONB) TO authenticated;
