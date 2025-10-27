-- ========================================
-- MIGRATION: Índice para verificar envios do dia
-- Data: 2025-10-27
-- ========================================

-- Criar índice composto para verificar se uma mensagem já foi enviada hoje
-- Usado pelo scheduler para prevenir envios duplicados no mesmo dia

DROP INDEX IF EXISTS public.idx_historico_envios_agendamento_data_status;

CREATE INDEX idx_historico_envios_agendamento_data_status 
ON public.historico_envios(agendamento_id, enviado_em DESC, status)
WHERE status = 'enviado';

COMMENT ON INDEX public.idx_historico_envios_agendamento_data_status IS 'Índice para verificar rapidamente se um agendamento já foi enviado hoje';

-- Atualizar estatísticas
ANALYZE public.historico_envios;

