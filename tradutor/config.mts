export type Config = { erpUrl: string; erpToken: string; kaizenUrl: string; telegramToken?: string; telegramChat?: string }

const ERP_PADRAO = 'https://api.meuerponline.com.br/publica'

function valor(env: Record<string, string | undefined>, nome: string): string | undefined {
  const texto = env[nome]?.trim()
  return texto ? texto : undefined
}

export function lerConfig(env: Record<string, string | undefined>): Config {
  const erpToken = valor(env, 'MEUERP_TOKEN')
  if (erpToken === undefined) throw new Error('falta MEUERP_TOKEN')
  const kaizenUrl = valor(env, 'KAIZEN_URL')
  if (kaizenUrl === undefined) throw new Error('falta KAIZEN_URL')
  const config: Config = { erpUrl: valor(env, 'MEUERP_URL') ?? ERP_PADRAO, erpToken, kaizenUrl }
  // Sem as duas variáveis do Telegram, as mensagens saem só no console (criarEnvioTelegram).
  const telegramToken = valor(env, 'TELEGRAM_TOKEN')
  const telegramChat = valor(env, 'TELEGRAM_CHAT')
  if (telegramToken !== undefined) config.telegramToken = telegramToken
  if (telegramChat !== undefined) config.telegramChat = telegramChat
  return config
}
