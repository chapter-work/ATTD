-- ══════════════════════════════════════════════════════
-- ATTD — projects 테이블 부대비용/회계 컬럼 추가
-- Supabase Dashboard > SQL Editor 에서 실행
-- ══════════════════════════════════════════════════════

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS confirmed_at           DATE,
  ADD COLUMN IF NOT EXISTS delivered_at           DATE,
  ADD COLUMN IF NOT EXISTS cost_local_logistics   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_freight           NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_domestic_customs  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_domestic_delivery NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_installation      NUMERIC DEFAULT 300000,
  ADD COLUMN IF NOT EXISTS cost_other             NUMERIC DEFAULT 0;
