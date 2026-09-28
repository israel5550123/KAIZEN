import pg from 'pg'

export type Cliente = pg.Client

// Nada de dinheiro, quantidade ou data vira number ou Date do JavaScript: chegam como o texto do Postgres.
for (const oid of [1114, 1184, 1082, 1700, 20]) {
  pg.types.setTypeParser(oid, (texto: string) => texto)
}

export function garantirLocal(url: string): void {
  let endereco: URL
  try {
    endereco = new URL(url)
  } catch {
    throw new Error('recusado: só localhost:5434 nos testes')
  }
  const hostLocal = endereco.hostname === 'localhost' || endereco.hostname === '127.0.0.1'
  if (!hostLocal || endereco.port !== '5434') {
    throw new Error('recusado: só localhost:5434 nos testes')
  }
}

export async function conectar(url: string): Promise<Cliente> {
  // Sem prazo, o pg espera para sempre um banco que aceita a conexão e não responde; com ele, cai em "o banco do Kaizen não respondeu".
  const cliente = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 })
  // Sem este ouvinte, uma queda da conexão com o cliente parado derruba o processo; a próxima consulta falha e o erro segue o caminho normal.
  cliente.on('error', () => undefined)
  await cliente.connect()
  try {
    await cliente.query(`set time zone 'America/Fortaleza'`)
    // Datas escritas como texto (criado_em::text) saem AAAA-MM-DD, qualquer que seja o padrão do servidor.
    await cliente.query(`set datestyle = 'ISO, YMD'`)
  } catch (erro) {
    await cliente.end().catch(() => undefined)
    throw erro
  }
  return cliente
}

export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T> {
  await cliente.query('begin')
  try {
    const resultado = await fazer()
    // Se um comando falhou lá dentro e o erro foi engolido, o Postgres responde ao commit com ROLLBACK, sem erro.
    const fim = await cliente.query('commit')
    if (fim.command === 'ROLLBACK') {
      throw new Error('a transação foi desfeita pelo Postgres: um comando falhou dentro dela')
    }
    return resultado
  } catch (erro) {
    await cliente.query('rollback').catch(() => undefined)
    throw erro
  }
}
