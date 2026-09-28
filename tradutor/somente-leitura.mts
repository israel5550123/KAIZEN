const PROIBIDAS = new Set([
  'insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke',
  'copy', 'call', 'do', 'execute', 'lock', 'set', 'reset', 'refresh', 'comment', 'nextval', 'setval',
  // select ... into cria tabela; for share e for key share prendem linhas; set_config muda a sessão
  'into', 'share', 'set_config',
])

// Famílias de funções recusadas pelo começo da palavra: lo_import, dblink_exec, pg_sleep_for, pg_advisory_lock_shared...
const COMECOS_PROIBIDOS = [
  'lo_', 'dblink', 'pg_sleep', 'pg_terminate_backend', 'pg_cancel_backend', 'pg_reload_conf', 'pg_notify', 'pg_advisory_lock',
]

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
    if (COMECOS_PROIBIDOS.some((comeco) => palavra.startsWith(comeco))) throw new Error(`recusado: contém a função ${palavra}`)
  }
  return texto
}
