-- ============================================
-- SCRIPT COMPLETO - BANCO DE DADOS
-- Execute no SQL Editor do Supabase
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA 1: Usuários Autorizados
-- ============================================
CREATE TABLE IF NOT EXISTS public.usuarios_autorizados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone VARCHAR(25) UNIQUE NOT NULL,
  nome VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.usuarios_autorizados IS 'Usuários autorizados a usar o bot, sincronizados do grupo.';

-- ============================================
-- TABELA 2: Agendamentos
-- ============================================
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios_autorizados(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL CHECK (LENGTH(mensagem) <= 5000),
  destinatario_tipo VARCHAR(10) NOT NULL CHECK (destinatario_tipo IN ('grupo', 'contato')),
  destinatario_id VARCHAR(100) NOT NULL,
  destinatario_nome VARCHAR(100),
  hora_envio TIME NOT NULL,
  dias_semana INTEGER[], -- 1=Seg, 2=Ter, ..., 7=Dom
  intervalo_minutos INTEGER DEFAULT 0 CHECK (intervalo_minutos >= 0),
  ativo BOOLEAN DEFAULT true,
  proximo_envio TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.agendamentos IS 'Armazena todas as mensagens programadas.';
COMMENT ON COLUMN public.agendamentos.dias_semana IS '1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab, 7=Dom. Nulo para todos os dias.';

-- ============================================
-- TABELA 3: Sessões de Comando
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessoes_comando (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone VARCHAR(25) UNIQUE NOT NULL,
  estado VARCHAR(50) NOT NULL,
  dados_temporarios JSONB DEFAULT '{}'::jsonb,
  expira_em TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.sessoes_comando IS 'Armazena conversas em andamento para criação de agendamentos.';

-- ============================================
-- TABELA 4: Histórico de Envios
-- ============================================
CREATE TABLE IF NOT EXISTS public.historico_envios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('enviado', 'erro', 'pendente')),
  mensagem_id VARCHAR(100),
  erro TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.historico_envios IS 'Log de todas as mensagens enviadas pelos agendamentos.';

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_usuarios_telefone ON public.usuarios_autorizados(telefone);
CREATE INDEX IF NOT EXISTS idx_agendamentos_proximo_envio ON public.agendamentos(proximo_envio) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_sessoes_telefone ON public.sessoes_comando(telefone);
CREATE INDEX IF NOT EXISTS idx_historico_agendamento ON public.historico_envios(agendamento_id);

-- Função para atualizar o campo 'atualizado_em'
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS \$\$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

-- Triggers para as tabelas
DROP TRIGGER IF EXISTS set_timestamp ON public.usuarios_autorizados;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.usuarios_autorizados
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON public.agendamentos;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();

-- Habilitar RLS (Row Level Security) - Boa prática de segurança
ALTER TABLE public.usuarios_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_comando ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_envios ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Permitir acesso total via service_role key, que será usada pelos scripts)
CREATE POLICY "Permitir acesso total para service_role" ON public.usuarios_autorizados FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Permitir acesso total para service_role" ON public.agendamentos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Permitir acesso total para service_role" ON public.sessoes_comando FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Permitir acesso total para service_role" ON public.historico_envios FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- TABELA 5: Auditoria de Agendamentos
-- ============================================
CREATE TABLE IF NOT EXISTS public.auditoria_agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios_autorizados(id) ON DELETE CASCADE,
  acao VARCHAR(20) NOT NULL CHECK (acao IN ('criado', 'editado', 'ativado', 'desativado', 'deletado')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.auditoria_agendamentos IS 'Registra todas as alterações feitas nos agendamentos';
COMMENT ON COLUMN public.auditoria_agendamentos.acao IS 'Tipo de ação: criado, editado, ativado, desativado, deletado';
COMMENT ON COLUMN public.auditoria_agendamentos.dados_anteriores IS 'Estado anterior do agendamento (JSON)';
COMMENT ON COLUMN public.auditoria_agendamentos.dados_novos IS 'Estado novo do agendamento (JSON)';

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_auditoria_agendamento ON public.auditoria_agendamentos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria_agendamentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em ON public.auditoria_agendamentos(criado_em DESC);

-- Habilitar RLS
ALTER TABLE public.auditoria_agendamentos ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Permitir acesso total para service_role" ON public.auditoria_agendamentos FOR ALL USING (auth.role() = 'service_role');

-- Adicionar coluna modificado_por na tabela agendamentos
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS modificado_por UUID REFERENCES public.usuarios_autorizados(id);

COMMENT ON COLUMN public.agendamentos.modificado_por IS 'Último usuário que modificou o agendamento';

-- ============================================
-- FIM DO SCRIPT
-- ============================================
