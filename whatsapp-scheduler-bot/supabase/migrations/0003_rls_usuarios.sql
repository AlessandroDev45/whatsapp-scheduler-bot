-- ============================================
-- POLÍTICAS RLS PARA USUÁRIOS NORMAIS
-- ============================================
-- Permite que usuários autenticados gerenciem seus próprios agendamentos

-- 1. POLÍTICA DE SELECT (Visualizar)
-- Usuários podem ver apenas seus próprios agendamentos
DROP POLICY IF EXISTS "Usuarios podem ver seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuarios podem ver seus agendamentos" 
ON public.agendamentos 
FOR SELECT 
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios_autorizados 
    WHERE telefone = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- 2. POLÍTICA DE INSERT (Criar)
-- Usuários podem criar agendamentos para si mesmos
DROP POLICY IF EXISTS "Usuarios podem criar seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuarios podem criar seus agendamentos" 
ON public.agendamentos 
FOR INSERT 
WITH CHECK (
  usuario_id IN (
    SELECT id FROM public.usuarios_autorizados 
    WHERE telefone = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- 3. POLÍTICA DE UPDATE (Atualizar)
-- Usuários podem atualizar apenas seus próprios agendamentos
DROP POLICY IF EXISTS "Usuarios podem atualizar seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuarios podem atualizar seus agendamentos" 
ON public.agendamentos 
FOR UPDATE 
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios_autorizados 
    WHERE telefone = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- 4. POLÍTICA DE DELETE (Deletar)
-- Usuários podem deletar apenas seus próprios agendamentos
DROP POLICY IF EXISTS "Usuarios podem deletar seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuarios podem deletar seus agendamentos" 
ON public.agendamentos 
FOR DELETE 
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios_autorizados 
    WHERE telefone = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- ============================================
-- POLÍTICAS PARA GRUPOS_USUARIO
-- ============================================

-- SELECT
DROP POLICY IF EXISTS "Usuarios podem ver seus grupos" ON public.grupos_usuario;
CREATE POLICY "Usuarios podem ver seus grupos" 
ON public.grupos_usuario 
FOR SELECT 
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios_autorizados 
    WHERE telefone = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- INSERT
DROP POLICY IF EXISTS "Usuarios podem criar seus grupos" ON public.grupos_usuario;
CREATE POLICY "Usuarios podem criar seus grupos" 
ON public.grupos_usuario 
FOR INSERT 
WITH CHECK (
  usuario_id IN (
    SELECT id FROM public.usuarios_autorizados 
    WHERE telefone = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- UPDATE
DROP POLICY IF EXISTS "Usuarios podem atualizar seus grupos" ON public.grupos_usuario;
CREATE POLICY "Usuarios podem atualizar seus grupos" 
ON public.grupos_usuario 
FOR UPDATE 
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios_autorizados 
    WHERE telefone = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- DELETE
DROP POLICY IF EXISTS "Usuarios podem deletar seus grupos" ON public.grupos_usuario;
CREATE POLICY "Usuarios podem deletar seus grupos" 
ON public.grupos_usuario 
FOR DELETE 
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios_autorizados 
    WHERE telefone = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON POLICY "Usuarios podem ver seus agendamentos" ON public.agendamentos IS 'Permite que usuários vejam apenas seus próprios agendamentos';
COMMENT ON POLICY "Usuarios podem criar seus agendamentos" ON public.agendamentos IS 'Permite que usuários criem agendamentos para si mesmos';
COMMENT ON POLICY "Usuarios podem atualizar seus agendamentos" ON public.agendamentos IS 'Permite que usuários atualizem apenas seus próprios agendamentos';
COMMENT ON POLICY "Usuarios podem deletar seus agendamentos" ON public.agendamentos IS 'Permite que usuários deletem apenas seus próprios agendamentos';

