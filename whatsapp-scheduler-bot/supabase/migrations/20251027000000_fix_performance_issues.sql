-- ========================================
-- CORREÇÃO DE PROBLEMAS DE PERFORMANCE
-- Detectados pelo Supabase Database Linter
-- ========================================

-- ========================================
-- 1. CORRIGIR RLS POLICIES (AUTH INITPLAN)
-- ========================================

-- Problema: auth.role() é reavaliado para cada linha
-- Solução: Usar (SELECT auth.role()) para avaliar apenas uma vez

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
-- 2. REMOVER ÍNDICES DUPLICADOS
-- ========================================

-- grupos_usuario tem índices idênticos: idx_grupos_usuario_grupo_nome e idx_grupos_usuario_nome
-- Manter apenas idx_grupos_usuario_nome (mais genérico)
DROP INDEX IF EXISTS public.idx_grupos_usuario_grupo_nome;

-- ========================================
-- 3. ADICIONAR ÍNDICES PARA FOREIGN KEYS
-- ========================================

-- 3.1 agendamentos.usuario_id (já deve existir, mas vamos garantir)
CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario_id 
ON public.agendamentos(usuario_id);

-- 3.2 agendamentos.modificado_por
CREATE INDEX IF NOT EXISTS idx_agendamentos_modificado_por 
ON public.agendamentos(modificado_por);

-- ========================================
-- 4. REMOVER ÍNDICES NÃO UTILIZADOS
-- ========================================

-- Estes índices nunca foram usados e podem ser removidos
-- Se precisarmos no futuro, podemos recriá-los

-- 4.1 grupos_usuario - índices não utilizados
DROP INDEX IF EXISTS public.idx_grupos_usuario_ativo;
DROP INDEX IF EXISTS public.idx_grupos_usuario_tipo;

-- 4.2 agendamentos - índices não utilizados
DROP INDEX IF EXISTS public.idx_agendamentos_data_termino;
DROP INDEX IF EXISTS public.idx_agendamentos_proximo_envio;

-- ========================================
-- 5. CRIAR ÍNDICES ÚTEIS (BASEADO NO USO REAL)
-- ========================================

-- 5.1 agendamentos - índice composto para queries comuns
-- Usado em: buscar agendamentos ativos de um usuário
CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario_ativo 
ON public.agendamentos(usuario_id, ativo) 
WHERE ativo = true;

-- 5.2 agendamentos - índice para scheduler
-- Usado em: buscar próximos agendamentos a enviar
CREATE INDEX IF NOT EXISTS idx_agendamentos_scheduler 
ON public.agendamentos(proximo_envio, ativo) 
WHERE ativo = true AND proximo_envio IS NOT NULL;

-- 5.3 sessoes_comando - índice para limpeza de sessões expiradas
CREATE INDEX IF NOT EXISTS idx_sessoes_comando_expira_em
ON public.sessoes_comando(expira_em);

-- 5.4 historico_envios - índice para buscar histórico por agendamento
CREATE INDEX IF NOT EXISTS idx_historico_envios_agendamento_id 
ON public.historico_envios(agendamento_id, enviado_em DESC);

-- 5.5 grupos_usuario - índice para buscar grupos ativos de um usuário
CREATE INDEX IF NOT EXISTS idx_grupos_usuario_usuario_ativo 
ON public.grupos_usuario(usuario_id, ativo) 
WHERE ativo = true;

-- ========================================
-- 6. ANÁLISE E VACUUM
-- ========================================

-- Atualizar estatísticas do banco
ANALYZE public.usuarios_autorizados;
ANALYZE public.agendamentos;
ANALYZE public.sessoes_comando;
ANALYZE public.historico_envios;
ANALYZE public.auditoria_agendamentos;
ANALYZE public.grupos_usuario;

-- ========================================
-- FIM DA MIGRATION
-- ========================================

-- Comentário final
COMMENT ON TABLE public.usuarios_autorizados IS 'Tabela de usuários autorizados - RLS otimizado em 2025-10-27';
COMMENT ON TABLE public.agendamentos IS 'Tabela de agendamentos - Índices otimizados em 2025-10-27';
COMMENT ON TABLE public.grupos_usuario IS 'Tabela de grupos - Índices duplicados removidos em 2025-10-27';

