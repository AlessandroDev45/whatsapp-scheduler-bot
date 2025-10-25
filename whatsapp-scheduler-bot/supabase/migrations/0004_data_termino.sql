-- ============================================
-- Migration: Adicionar data de término aos agendamentos
-- ============================================

-- Adicionar coluna data_termino
ALTER TABLE public.agendamentos 
ADD COLUMN IF NOT EXISTS data_termino DATE;

COMMENT ON COLUMN public.agendamentos.data_termino IS 'Data final para o agendamento (opcional). Após essa data, o agendamento será automaticamente desativado.';

-- Criar índice para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_termino ON public.agendamentos(data_termino) WHERE data_termino IS NOT NULL;

