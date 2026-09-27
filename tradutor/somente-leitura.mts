const PROIBIDAS = new Set([
  'insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke',
  'copy', 'call', 'do', 'execute', 'lock', 'set', 'reset', 'refresh', 'comment', 'nextval', 'setval',
  'pg_sleep', 'dblink',
])

// Palavra = sequência de letras, dígitos, _ e $ que começa por letra ou _ (como um nome no SQL).
// Assim "offset", "dataset" e "datahora_set" não são a palavra "set".
const PALAVRA = /[a-z_][a-z0-9_$]*/g

export function verificarSomenteLeitura(sql: string): string {
  let texto = sql.trim()
  if (texto.endsWith(';')) texto = texto.slice(0, -1).trim()
  if (texto === '') throw new Error('recusado: SQL vazio')
  if (texto.includes(';')) throw new Error('recusado: mais de um comando (;)')
  if (texto.includes('--') || texto.includes('/*')) throw new Error('recusado: comentário no SQL')
  const minusculo = texto.toLowerCase()
  if (!/^(select|with)\b/.test(minusculo)) throw new Error('recusado: só SELECT ou WITH')
  for (const palavra of minusculo.match(PALAVRA) ?? []) {
    if (PROIBIDAS.has(palavra)) throw new Error(`recusado: contém a palavra ${palavra}`)
    if (palavra.startsWith('lo_')) throw new Error(`recusado: contém ${palavra} (objeto grande)`)
  }
  return texto
}
