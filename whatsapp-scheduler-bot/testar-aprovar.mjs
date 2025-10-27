import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

console.log('\n🔍 TESTANDO LÓGICA DE APROVAÇÃO...\n')
console.log('='.repeat(70))

// Simular o que acontece no webhook
const ADMIN_NUMBER = '553184549893'

// Simular diferentes formatos de sender
const testCases = [
  { sender: '553184549893', desc: 'Apenas número' },
  { sender: '553184549893@s.whatsapp.net', desc: 'Formato JID completo' },
  { sender: '5531845498930', desc: 'Número com dígito extra' },
]

console.log('\n📋 TESTANDO VERIFICAÇÃO DE ADMIN:\n')

testCases.forEach(test => {
  const isAdmin = test.sender === ADMIN_NUMBER
  const emoji = isAdmin ? '✅' : '❌'
  console.log(`${emoji} ${test.desc}`)
  console.log(`   Sender: "${test.sender}"`)
  console.log(`   Admin: "${ADMIN_NUMBER}"`)
  console.log(`   Match: ${isAdmin}`)
  console.log('')
})

console.log('='.repeat(70))

// Buscar usuários pendentes
console.log('\n👥 USUÁRIOS PENDENTES DE APROVAÇÃO:\n')

const { data: pendentes } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('ativo', false)
  .order('criado_em', { ascending: false })

if (pendentes && pendentes.length > 0) {
  pendentes.forEach(u => {
    console.log(`❌ ${u.nome}`)
    console.log(`   📞 Telefone: ${u.telefone}`)
    console.log(`   📅 Criado em: ${new Date(u.criado_em).toLocaleString('pt-BR')}`)
    console.log(`   🎭 Role: ${u.role}`)
    console.log('')
    console.log(`   💡 Para aprovar: /aprovar ${u.telefone}`)
    console.log('')
  })
} else {
  console.log('   ✅ Nenhum usuário pendente de aprovação')
}

console.log('='.repeat(70))
console.log('')

