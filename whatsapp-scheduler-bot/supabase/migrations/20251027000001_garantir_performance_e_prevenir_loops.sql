-- ========================================
-- MIGRATION: GARANTIR PERFORMANCE E PREVENIR LOOPS
-- Data: 2025-10-27
-- ========================================

-- Habilitar extensão UUID (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- PARTE 1: OTIMIZAR RLS POLICIES
-- ========================================

-- Remover políticas antigas e criar novas otimizadas
-- Usar (SELECT auth.role()) em vez de auth.role() para evitar re-avaliação

-- 1.1 usuarios_autorizados
DROP POLICY IF EXISTS "Permitir acesso total para service_role" ON public.usuarios_autorizados;
CREATE POLICY "Permitir acesso total para service_role" 
ON public.usuarios_autorizados
FOR ALL
TO authenticated
USING ((SELECT auth.role()) = 'service_role');

-- 1.2 agendamentos
DROP POLICY IF EXISTS "Permitir acesso total para service_role" ON public.agendamentos;
CREATE POLICY "Permitir acesso total para service_role" 
ON public.agendamentos
FOR ALL
TO authenticated
USING ((SELECT auth.role()) = 'service_role');

-- 1.3 sessoes_comando
DROP POLICY IF EXISTS "Permitir acesso total para service_role" ON public.sessoes_comando;
CREATE POLICY "Permitir acesso total para service_role" 
ON public.sessoes_comando
FOR ALL
TO authenticated
USING ((SELECT auth.role()) = 'service_role');

-- 1.4 historico_envios
DROP POLICY IF EXISTS "Permitir acesso total para service_role" ON public.historico_envios;
CREATE POLICY "Permitir acesso total para service_role" 
ON public.historico_envios
FOR ALL
TO authenticated
USING ((SELECT auth.role()) = 'service_role');

-- 1.5 auditoria_agendamentos
DROP POLICY IF EXISTS "Permitir acesso total para service_role" ON public.auditoria_agendamentos;
CREATE POLICY "Permitir acesso total para service_role" 
ON public.auditoria_agendamentos
FOR ALL
TO authenticated
USING ((SELECT auth.role()) = 'service_role');

-- 1.6 grupos_usuario
DROP POLICY IF EXISTS "Permitir acesso total para service_role" ON public.grupos_usuario;
CREATE POLICY "Permitir acesso total para service_role" 
ON public.grupos_usuario
FOR ALL
TO authenticated
USING ((SELECT auth.role()) = 'service_role');

-- ========================================
-- PARTE 2: CRIAR ÍNDICES PARA FOREIGN KEYS
-- ========================================

-- Estes índices são CRÍTICOS para performance de JOINs e DELETEs em cascata

-- 2.1 agendamentos.usuario_id
DROP INDEX IF EXISTS public.idx_agendamentos_usuario_id;
CREATE INDEX idx_agendamentos_usuario_id 
ON public.agendamentos(usuario_id);

-- 2.2 agendamentos.modificado_por
DROP INDEX IF EXISTS public.idx_agendamentos_modificado_por;
CREATE INDEX idx_agendamentos_modificado_por 
ON public.agendamentos(modificado_por) 
WHERE modificado_por IS NOT NULL;

-- 2.3 historico_envios.agendamento_id (já existe, mas vamos garantir)
DROP INDEX IF EXISTS public.idx_historico_agendamento;
CREATE INDEX idx_historico_agendamento 
ON public.historico_envios(agendamento_id);

-- 2.4 auditoria_agendamentos.agendamento_id (já existe, mas vamos garantir)
DROP INDEX IF EXISTS public.idx_auditoria_agendamento;
CREATE INDEX idx_auditoria_agendamento 
ON public.auditoria_agendamentos(agendamento_id);

-- 2.5 auditoria_agendamentos.usuario_id (já existe, mas vamos garantir)
DROP INDEX IF EXISTS public.idx_auditoria_usuario;
CREATE INDEX idx_auditoria_usuario 
ON public.auditoria_agendamentos(usuario_id);

-- 2.6 grupos_usuario.usuario_id (já existe, mas vamos garantir)
DROP INDEX IF EXISTS public.idx_grupos_usuario_usuario_id;
CREATE INDEX idx_grupos_usuario_usuario_id 
ON public.grupos_usuario(usuario_id);

-- ========================================
-- PARTE 3: REMOVER ÍNDICES DUPLICADOS E NÃO UTILIZADOS
-- ========================================

-- 3.1 Remover índices duplicados em grupos_usuario
DROP INDEX IF EXISTS public.idx_grupos_usuario_grupo_nome;
DROP INDEX IF EXISTS public.idx_grupos_usuario_ativo;
DROP INDEX IF EXISTS public.idx_grupos_usuario_tipo;

-- 3.2 Remover índices não utilizados em agendamentos
DROP INDEX IF EXISTS public.idx_agendamentos_data_termino;
DROP INDEX IF EXISTS public.idx_agendamentos_proximo_envio;

-- ========================================
-- PARTE 4: CRIAR ÍNDICES COMPOSTOS OTIMIZADOS
-- ========================================

-- Estes índices são baseados nas queries REAIS que o sistema faz

-- 4.1 agendamentos - buscar agendamentos ativos de um usuário
DROP INDEX IF EXISTS public.idx_agendamentos_usuario_ativo;
CREATE INDEX idx_agendamentos_usuario_ativo 
ON public.agendamentos(usuario_id, ativo) 
WHERE ativo = true;

-- 4.2 agendamentos - scheduler (buscar próximos envios)
DROP INDEX IF EXISTS public.idx_agendamentos_scheduler;
CREATE INDEX idx_agendamentos_scheduler 
ON public.agendamentos(proximo_envio, ativo) 
WHERE ativo = true AND proximo_envio IS NOT NULL;

-- 4.3 agendamentos - buscar por data de término
DROP INDEX IF EXISTS public.idx_agendamentos_termino_ativo;
CREATE INDEX idx_agendamentos_termino_ativo 
ON public.agendamentos(data_termino, ativo) 
WHERE ativo = true AND data_termino IS NOT NULL;

-- 4.4 sessoes_comando - limpeza de sessões expiradas
DROP INDEX IF EXISTS public.idx_sessoes_comando_expira_em;
CREATE INDEX idx_sessoes_comando_expira_em 
ON public.sessoes_comando(expira_em);

-- 4.5 historico_envios - buscar histórico por agendamento (ordenado)
DROP INDEX IF EXISTS public.idx_historico_envios_agendamento_data;
CREATE INDEX idx_historico_envios_agendamento_data 
ON public.historico_envios(agendamento_id, enviado_em DESC);

-- 4.6 grupos_usuario - buscar grupos ativos de um usuário
DROP INDEX IF EXISTS public.idx_grupos_usuario_usuario_ativo;
CREATE INDEX idx_grupos_usuario_usuario_ativo 
ON public.grupos_usuario(usuario_id, ativo) 
WHERE ativo = true;

-- 4.7 grupos_usuario - busca por nome (case-insensitive)
DROP INDEX IF EXISTS public.idx_grupos_usuario_nome_lower;
CREATE INDEX idx_grupos_usuario_nome_lower 
ON public.grupos_usuario(usuario_id, LOWER(grupo_nome)) 
WHERE ativo = true;

-- ========================================
-- PARTE 5: CRIAR TABELA DE CONTROLE DE MENSAGENS
-- ========================================

-- Esta tabela previne loops infinitos armazenando IDs de mensagens processadas

CREATE TABLE IF NOT EXISTS public.mensagens_processadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(100) UNIQUE NOT NULL,
  sender VARCHAR(50) NOT NULL,
  processado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expira_em TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

COMMENT ON TABLE public.mensagens_processadas IS 'Cache de mensagens já processadas para prevenir loops infinitos (expira em 5 minutos)';
COMMENT ON COLUMN public.mensagens_processadas.message_id IS 'ID único da mensagem do WhatsApp';
COMMENT ON COLUMN public.mensagens_processadas.sender IS 'Número do remetente';
COMMENT ON COLUMN public.mensagens_processadas.expira_em IS 'Data de expiração - mensagens expiram em 5 minutos para permitir agendamentos recorrentes';

-- Índice para busca rápida por message_id
CREATE INDEX idx_mensagens_processadas_message_id 
ON public.mensagens_processadas(message_id);

-- Índice para limpeza de mensagens expiradas
CREATE INDEX idx_mensagens_processadas_expira_em 
ON public.mensagens_processadas(expira_em);

-- Habilitar RLS
ALTER TABLE public.mensagens_processadas ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Permitir acesso total para service_role" 
ON public.mensagens_processadas
FOR ALL
TO authenticated
USING ((SELECT auth.role()) = 'service_role');

-- ========================================
-- PARTE 6: FUNÇÃO PARA LIMPAR MENSAGENS ANTIGAS
-- ========================================

CREATE OR REPLACE FUNCTION public.limpar_mensagens_processadas()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.mensagens_processadas
  WHERE expira_em < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.limpar_mensagens_processadas() IS 'Remove mensagens processadas que já expiraram';

-- ========================================
-- PARTE 7: FUNÇÃO PARA VERIFICAR SE MENSAGEM FOI PROCESSADA
-- ========================================

CREATE OR REPLACE FUNCTION public.verificar_mensagem_processada(p_message_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  existe BOOLEAN;
BEGIN
  -- Verificar se existe
  SELECT EXISTS(
    SELECT 1 FROM public.mensagens_processadas 
    WHERE message_id = p_message_id 
    AND expira_em > NOW()
  ) INTO existe;
  
  -- Se não existe, inserir
  IF NOT existe THEN
    INSERT INTO public.mensagens_processadas (message_id, sender)
    VALUES (p_message_id, 'unknown')
    ON CONFLICT (message_id) DO NOTHING;
  END IF;
  
  RETURN existe;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verificar_mensagem_processada(VARCHAR) IS 'Verifica se uma mensagem já foi processada e registra se não foi';

-- ========================================
-- PARTE 8: ATUALIZAR ESTATÍSTICAS
-- ========================================

ANALYZE public.usuarios_autorizados;
ANALYZE public.agendamentos;
ANALYZE public.sessoes_comando;
ANALYZE public.historico_envios;
ANALYZE public.auditoria_agendamentos;
ANALYZE public.grupos_usuario;
ANALYZE public.mensagens_processadas;

-- ========================================
-- FIM DA MIGRATION
-- ========================================

