-- ============================================
-- Migration: Preencher destinatario_nome dos agendamentos existentes
-- ============================================

-- Atualizar agendamentos de grupos que existem na tabela grupos_usuario
UPDATE public.agendamentos ag
SET destinatario_nome = gu.grupo_nome
FROM public.grupos_usuario gu
WHERE ag.destinatario_id = gu.grupo_jid
  AND ag.destinatario_tipo = 'grupo'
  AND (ag.destinatario_nome IS NULL OR ag.destinatario_nome = '');

-- Para contatos, extrair o número do JID
UPDATE public.agendamentos
SET destinatario_nome = REPLACE(REPLACE(destinatario_id, '@s.whatsapp.net', ''), '@c.us', '')
WHERE destinatario_tipo = 'contato'
  AND (destinatario_nome IS NULL OR destinatario_nome = '');

-- Comentário
COMMENT ON COLUMN public.agendamentos.destinatario_nome IS 'Nome amigável do destinatário (grupo ou contato)';

