-- Migration: Create suggestions table
-- Date: 2025-12-15

CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  category text CHECK (category IN ('feature', 'bug', 'improvement', 'other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'planned', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON public.suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.suggestions(status);

-- RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own suggestions
DROP POLICY IF EXISTS "Suggestions - select own" ON public.suggestions;
CREATE POLICY "Suggestions - select own" ON public.suggestions
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own suggestions
DROP POLICY IF EXISTS "Suggestions - insert own" ON public.suggestions;
CREATE POLICY "Suggestions - insert own" ON public.suggestions
FOR INSERT WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.suggestions IS 'User feedback and feature suggestions';
