-- ============================================
-- MIGRATION: Sistema de Auditoria
-- ============================================

-- Tabela de Auditoria de Agendamentos
CREATE TABLE IF NOT EXISTS public.auditoria_agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios_autorizados(id) ON DELETE CASCADE,
  acao VARCHAR(20) NOT NULL CHECK (acao IN ('criado', 'editado', 'ativado', 'desativado', 'deletado')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.auditoria_agendamentos IS 'Registra todas as alteraÃ§Ãµes feitas nos agendamentos';
COMMENT ON COLUMN public.auditoria_agendamentos.acao IS 'Tipo de aÃ§Ã£o: criado, editado, ativado, desativado, deletado';
COMMENT ON COLUMN public.auditoria_agendamentos.dados_anteriores IS 'Estado anterior do agendamento (JSON)';
COMMENT ON COLUMN public.auditoria_agendamentos.dados_novos IS 'Estado novo do agendamento (JSON)';

-- Ãndices para otimizaÃ§Ã£o
CREATE INDEX IF NOT EXISTS idx_auditoria_agendamento ON public.auditoria_agendamentos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria_agendamentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em ON public.auditoria_agendamentos(criado_em DESC);

-- Habilitar RLS
ALTER TABLE public.auditoria_agendamentos ENABLE ROW LEVEL SECURITY;

-- PolÃ­tica de acesso
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auditoria_agendamentos' AND policyname = 'Permitir acesso total para service_role') THEN
    CREATE POLICY "Permitir acesso total para service_role" ON public.auditoria_agendamentos FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Adicionar coluna modificado_por na tabela agendamentos
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS modificado_por UUID REFERENCES public.usuarios_autorizados(id);

COMMENT ON COLUMN public.agendamentos.modificado_por IS 'Ãšltimo usuÃ¡rio que modificou o agendamento';

