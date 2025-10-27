import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const telefone = '553196797442'

console.log('\n🔍 VERIFICANDO STATUS DE ISA...\n')
console.log('='.repeat(70))

const { data: usuario, error } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', telefone)
  .single()

if (error) {
  console.log('❌ ERRO:', error)
} else {
  console.log('👤 USUÁRIO ENCONTRADO:\n')
  console.log(`   Nome: ${usuario.nome}`)
  console.log(`   Telefone: ${usuario.telefone}`)
  console.log(`   Role: ${usuario.role}`)
  console.log(`   Ativo: ${usuario.ativo}`)
  console.log(`   ID: ${usuario.id}`)
  console.log(`   Criado em: ${new Date(usuario.criado_em).toLocaleString('pt-BR')}`)
  console.log('')
  
  if (usuario.ativo) {
    console.log('✅ Status: ATIVO - Pode usar o bot')
  } else {
    console.log('❌ Status: INATIVO - Aguardando aprovação')
  }
}

console.log('')
console.log('='.repeat(70))
console.log('')

