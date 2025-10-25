import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function criarAgendamentoTeste() {
  console.log('🚀 CRIANDO AGENDAMENTO DE TESTE\n')
  console.log('='.repeat(60))

  try {
    // 1. Buscar usuário Isa
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios_autorizados')
      .select('*')
      .eq('telefone', '553196797442')
      .single()

    if (usuarioError || !usuario) {
      console.error('❌ Usuário não encontrado!')
      process.exit(1)
    }

    console.log(`✅ Usuário: ${usuario.nome} (${usuario.telefone})`)

    // 2. Buscar grupo "Grupo da família"
    const { data: grupos, error: grupoError } = await supabase
      .from('grupos_usuario')
      .select('*')
      .eq('usuario_id', usuario.id)
      .ilike('grupo_nome', '%família%')

    if (grupoError || !grupos || grupos.length === 0) {
      console.error('❌ Grupo "Grupo da família" não encontrado!')
      console.log('\n📋 Grupos disponíveis:')
      
      const { data: todosGrupos } = await supabase
        .from('grupos_usuario')
        .select('*')
        .eq('usuario_id', usuario.id)
      
      todosGrupos?.forEach(g => {
        console.log(`   - ${g.grupo_nome} (${g.grupo_jid})`)
      })
      
      process.exit(1)
    }

    const grupo = grupos[0]
    console.log(`✅ Grupo: ${grupo.grupo_nome} (${grupo.grupo_jid})`)

    // 3. Criar agendamento para hoje às 23:45
    const hoje = new Date()
    const diaDaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay() // 1=Seg, ..., 7=Dom
    
    const proximoEnvio = new Date()
    proximoEnvio.setHours(23, 45, 0, 0)
    
    // Se já passou das 23:45, agendar para amanhã
    if (proximoEnvio <= new Date()) {
      proximoEnvio.setDate(proximoEnvio.getDate() + 1)
    }

    const mensagem = `💝 Boa noite, família querida! 

Que todos tenham uma noite abençoada e repleta de paz! 🌙✨

Descansem bem! 😴💤

Com carinho,
Isa 🐱`

    const agendamento = {
      usuario_id: usuario.id,
      mensagem: mensagem,
      destinatario_tipo: 'grupo',
      destinatario_id: grupo.grupo_jid,
      destinatario_nome: grupo.grupo_nome,
      hora_envio: '23:45:00',
      dias_semana: [diaDaSemana], // Apenas hoje
      data_termino: hoje.toISOString().split('T')[0], // Termina hoje
      ativo: true,
      proximo_envio: proximoEnvio.toISOString(),
      modificado_por: usuario.id
    }

    console.log('\n📋 Criando agendamento:')
    console.log(`   Mensagem: ${mensagem.substring(0, 50)}...`)
    console.log(`   Destinatário: ${grupo.grupo_nome}`)
    console.log(`   Horário: 23:45`)
    console.log(`   Dia da semana: ${diaDaSemana}`)
    console.log(`   Próximo envio: ${proximoEnvio.toLocaleString('pt-BR')}`)
    console.log(`   Termina: Hoje (${hoje.toLocaleDateString('pt-BR')})`)

    const { data: novoAgendamento, error: insertError } = await supabase
      .from('agendamentos')
      .insert(agendamento)
      .select()
      .single()

    if (insertError) {
      console.error('\n❌ Erro ao criar agendamento:', insertError)
      process.exit(1)
    }

    // Registrar auditoria
    await supabase.from('auditoria_agendamentos').insert({
      agendamento_id: novoAgendamento.id,
      usuario_id: usuario.id,
      acao: 'criado',
      dados_anteriores: null,
      dados_novos: novoAgendamento
    })

    console.log('\n' + '='.repeat(60))
    console.log('✅ AGENDAMENTO CRIADO COM SUCESSO!')
    console.log('='.repeat(60))
    console.log(`\n🆔 ID: ${novoAgendamento.id}`)
    console.log(`📱 Grupo: ${grupo.grupo_nome}`)
    console.log(`⏰ Horário: 23:45`)
    console.log(`📅 Próximo envio: ${proximoEnvio.toLocaleString('pt-BR')}`)
    console.log(`\n💡 O scheduler vai enviar automaticamente no horário programado!`)
    console.log(`\n🧪 Para testar agora, rode:`)
    console.log(`   npm run start:scheduler`)
    console.log('')

  } catch (error) {
    console.error('\n❌ ERRO:', error)
    process.exit(1)
  }
}

criarAgendamentoTeste()

