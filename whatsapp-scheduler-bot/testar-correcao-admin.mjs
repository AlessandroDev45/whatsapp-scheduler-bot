// Testar a correção da função verificarPermissaoAdmin

const ADMIN_NUMBER = '553184549893'

// Função ANTIGA (com bug)
function verificarPermissaoAdminANTIGA(telefone) {
  return telefone === ADMIN_NUMBER
}

// Função NOVA (corrigida)
function verificarPermissaoAdminNOVA(telefone) {
  // Extrair apenas o número do JID (remover @s.whatsapp.net ou @g.us)
  const numeroLimpo = telefone.split('@')[0]
  return numeroLimpo === ADMIN_NUMBER
}

console.log('\n🔍 TESTANDO CORREÇÃO DA VERIFICAÇÃO DE ADMIN\n')
console.log('='.repeat(70))

const testCases = [
  { sender: '553184549893', desc: 'Apenas número (formato antigo)' },
  { sender: '553184549893@s.whatsapp.net', desc: 'JID completo (formato real do WhatsApp)' },
  { sender: '5531999999999@s.whatsapp.net', desc: 'Outro usuário (não admin)' },
]

console.log('\n📋 COMPARAÇÃO ANTIGA vs NOVA:\n')

testCases.forEach(test => {
  const resultadoAntigo = verificarPermissaoAdminANTIGA(test.sender)
  const resultadoNovo = verificarPermissaoAdminNOVA(test.sender)
  
  const emojiAntigo = resultadoAntigo ? '✅' : '❌'
  const emojiNovo = resultadoNovo ? '✅' : '❌'
  
  const esperado = test.sender.startsWith('553184549893')
  const emojiEsperado = esperado ? '✅' : '❌'
  
  console.log(`📱 ${test.desc}`)
  console.log(`   Sender: "${test.sender}"`)
  console.log(`   ${emojiEsperado} Esperado: ${esperado}`)
  console.log(`   ${emojiAntigo} Função ANTIGA: ${resultadoAntigo} ${resultadoAntigo !== esperado ? '🔴 ERRO!' : ''}`)
  console.log(`   ${emojiNovo} Função NOVA: ${resultadoNovo} ${resultadoNovo !== esperado ? '🔴 ERRO!' : '✅ CORRETO!'}`)
  console.log('')
})

console.log('='.repeat(70))
console.log('\n📊 RESUMO:\n')
console.log('❌ FUNÇÃO ANTIGA: Falhava com JID completo (formato real do WhatsApp)')
console.log('✅ FUNÇÃO NOVA: Funciona com qualquer formato (número ou JID)')
console.log('')
console.log('🎯 CORREÇÃO APLICADA: Extrai apenas o número antes de comparar')
console.log('')

