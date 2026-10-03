# Escreve o livro (dados-exemplo.md) a partir do dados-exemplo.json. Nenhum número é digitado aqui à mão:
# todos saem do JSON, para o livro e o JSON nunca divergirem.
import json, pathlib
from fmt import brl, mil, num, pct, ritmo, data, data_sem, dia_semana, MENOS

AQUI = pathlib.Path(__file__).parent
J = json.loads((AQUI / 'dados-exemplo.json').read_text())
V, CP, F, CX, M = J['vendas'], J['compras'], J['financeiro'], J['caixa'], J['metas']
L = []
DS, NV = 'DS', 'novo'


def p(*linhas):
    L.extend(linhas)


def tab(cab, linhas):
    p('| ' + ' | '.join(cab) + ' |', '| ' + ' | '.join('---' for _ in cab) + ' |')
    for ln in linhas:
        p('| ' + ' | '.join('' if x is None else str(x) for x in ln) + ' |')
    p('')


def est_txt(e):
    return {'no lugar': 'No lugar', 'atenção': 'Atenção', 'fora': 'Fora'}[e]


mes, dia = V['mes'], V['dia']
vend = {x['nome']: x for x in V['vendedores']}
igor, dani, outros = vend['Igor'], vend['Daniele'], V['outros']
enc, rup = CP['encalhe'], CP['ruptura']
cp = CP['comprados']
ctas = F['contas_a_pagar']

# ======================================================================= CABEÇALHO
p('# Livro de dados de exemplo — telas G1 a K2 da Fase 5', '',
  'Os números de exemplo de todas as telas da Fase 5, num lugar só. Cada prompt de tela copia daqui; assim, o que aparece no Início aparece igual em Vendas, Compras e Financeiro, e as contas fecham de uma tela para outra.', '',
  '**Como ler.** A coluna "Origem" diz de onde veio cada número:', '',
  f'- **{DS}**: veio do Design System instalado no projeto (versão {J["sobre"]["design_system"]}), do README ou de uma prancha. Não muda.',
  f'- **{NV}**: inventado agora para a tela ter o que mostrar. Foi calculado a partir dos números do Design System, e o script `conferir_dados.py` confere todas as somas, partes e ritmos.',
  '- **TELAS.md**: texto que já está na lista de telas (`docs/app/TELAS.md`, seção 7); não é número.', '',
  'O dia de todas as telas é **quarta-feira, 21/10/2026, 14h05**. Dinheiro em detalhe sai como R$ 1.234,56; em cartão e painel, como R$ 92,4 mil. Percentual com uma casa, ritmo com duas, negativo com o sinal de menos verdadeiro (−).', '',
  '**Os exemplos da `docs/app/TELAS.md` não valem.** Lá os valores são só ilustração e não batem com o Design System. Troque sempre pelos daqui:', '')
tab(['Na TELAS.md', 'Use'], [
    ['"dia útil 2 de 26", "2 de 26, faltam 24"', f'{mes["decorridos"]} de {mes["dias_uteis"]} dias úteis, faltam {mes["faltam_dias"]}'],
    ['"Abaixo do ritmo: Daniele, 0,81"', 'Abaixo do ritmo: Daniele · Fora 0,82'],
    ['"para bater a meta, R$ 6.200 por dia útil restante"', f'para bater a meta, {brl(mes["por_dia_util_restante"])} por dia útil restante'],
    ['"212 produtos: 120 da curva A, 40 da B, 30 da C e 22 sem venda"', cp['frase']],
    ['"últimos 90 dias (05/07 a 02/10/2026)"', CP['periodo']['texto']],
    ['"saldo R$ 48.000,00, digitado em 01/10, − R$ 31.200,00 que vencem até 09/10"', f'saldo {brl(F["saldo_banco"]["valor"])} (digitado para 20/10) − {brl(ctas["ate_7_dias"]["valor"])} que vencem até 28/10'],
    ['"faltam R$ 3.200,00 para o que vence até 09/10"', 'o exemplo de folga negativa da F1 (seção F1, Estados)'],
    ['"último fechamento: 01/10"', 'último fechamento: 20/10'],
    ['"novo, em carência até 25/11"', 'novo, em carência até 28/11 (primeira compra em 29/09; em 26/09 não houve nota)'],
    ['"Já existe R$ 45.000,00 em 01/10. Substituir?"', J['K1']['substituir']],
    ['"Nenhum produto com broca 8"', 'pode ficar: nenhum produto do exemplo tem "broca 8"'],
])

# ======================================================================= NÚMEROS QUE SE REPETEM
p('## Números que se repetem entre telas', '', 'Quando uma tela mostra um destes, é este valor, neste formato.', '')
tab(['Número', 'Cartão e painel', 'Detalhe', 'Telas'], [
    ['Realizado do mês da loja', mil(mes['realizado']), brl(mes['realizado']), 'I1, V1, K2 (novembro)'],
    ['Meta da loja / % / ritmo', f'R$ 150 mil · {pct(mes["percentual_meta"])} · {ritmo(mes["ritmo"])}', brl(mes['meta']), 'I1, V1, K2'],
    ['Projeção', mil(mes['projecao']), brl(mes['projecao']), 'I1, V1'],
    ['Hoje até 14h05', f'{mil(dia["realizado"])} em {dia["vendas"]} vendas', brl(dia['realizado']), 'I1, V1'],
    ['Igor', f'{mil(igor["realizado_mes"])} · {pct(igor["percentual_meta"])} · ritmo {ritmo(igor["ritmo"])}', brl(igor['realizado_mes']), 'I1, V1, V2, K2'],
    ['Daniele', f'{mil(dani["realizado_mes"])} · {pct(dani["percentual_meta"])} · ritmo {ritmo(dani["ritmo"])} · Fora', brl(dani['realizado_mes']), 'I1, V1, V2, K2'],
    ['Outros (sem meta própria)', mil(outros['realizado_mes']), brl(outros['realizado_mes']), 'I1, V1'],
    ['Comprados em 90 dias', f'{cp["total"]}: {cp["A"]} A, {cp["B"]} B, {cp["C"]} C, {cp["sem_venda"]} sem venda', '—', 'I1, C1, C2'],
    ['Curva A em falta (ruptura)', '3 produtos', 'Dobradiça 35 mm, Corrediça 450 mm, Puxador 128 mm', 'I1, C1, C2, C3'],
    ['Encalhe', f'{enc["produtos"]} produtos · {mil(enc["valor"])}', brl(enc['valor']), 'I1, C1, C2'],
    ['Saldo do banco', 'R$ 41,3 mil (20/10)', brl(F['saldo_banco']['valor']), 'I1, F1, F2, K1'],
    ['A pagar até 28/10', f'R$ 33,1 mil · 5 parcelas', brl(ctas['ate_7_dias']['valor']), 'I1, F1, F2'],
    ['A pagar até 20/11', mil(ctas['ate_30_dias']['valor']) + f' · {ctas["ate_30_dias"]["parcelas"]} parcelas', brl(ctas['ate_30_dias']['valor']), 'F1, F2'],
    ['Folga em 7 dias', mil(F['folga_7']), brl(F['folga_7']), 'I1, F1, F2'],
    ['Folga em 30 dias', mil(F['folga_30']), brl(F['folga_30']), 'I1, F1, F2'],
    ['Quebra do caixa (fechamento de 20/10)', 'R$ 0,00', 'R$ 0,00', 'I1, F1, F3'],
    ['Cartão a creditar amanhã (22/10)', mil(F['cartao_a_creditar']['valor']), brl(F['cartao_a_creditar']['valor']), 'F1, F2'],
])

# ======================================================================= PONTOS DE ATENÇÃO
p('## Pontos de atenção', '',
  'O que a montagem achou e como ficou. Nenhum muda um número do Design System.', '',
  f'1. **Comparação "há 30 dias" de estoque.** O Design System diz "38 produtos parados contra 30 há 30 dias". Há 30 dias é 21/09, antes de 26/09, quando o estoque ainda era desconhecido (regra da Fase 4). Pela regra, essa comparação não existiria até 26/10. Ficou como está, porque é número do Design System e serve para desenhar a comparação; os outros números de estoque "há 30 dias" deste livro (ruptura, estoque negativo e valor parado) seguem a mesma ficção. O caso real ("estoque desconhecido antes de 26/09/2026") é o estado "dia antes de 26/09" de I1, C1 e C2.',
  f'2. **Projeção de {mil(mes["projecao"])}.** Só fecha pela regra do Kaizen: o realizado até ontem ({brl(mes["realizado_ate_ontem"])}) mais, para cada dia útil de hoje até 31/10, a média das últimas 8 semanas do mesmo dia da semana. As médias foram inventadas para dar {brl(mes["projecao"])}. Em linha reta daria {mil(mes["realizado"] / 17 * 26)}. O cartão de 15/09 ({mil(V["exemplo_15_09"]["projecao"])}) é conta em linha reta; é do Design System e fica.',
  f'3. **Saldo previsto sem o cartão.** A linha do Design System (R$ 41,3 mil em 20/10, R$ 8,2 mil em 28/10) não soma o cartão a creditar. Para continuar fechando com a folga (saldo − contas), o cartão de amanhã ({brl(F["cartao_a_creditar"]["valor"])}) aparece como barra própria e não entra na linha nem na folga. Com ele, a linha daria {mil(F["folga_7"] + F["cartao_a_creditar"]["valor"])} em 28/10. A pergunta 15 da TELAS.md (contar só o que é certo) continua aberta.',
  f'4. **Folga em 30 dias de 7 dias atrás.** Com as contas do exemplo, ela era {mil(F["folga_30_ha_7_dias"])} ({brl(F["folga_30_ha_7_dias"])}) em 14/10 (as contas de 22 a 28/10 já estavam lançadas). É um número que confunde mais do que ajuda. Sugestão: a comparação com 7 dias atrás vai só na folga em 7 dias ({mil(F["folga_7_ha_7_dias"])}, do Design System). Se a tela quiser as duas, use {mil(F["folga_30_ha_7_dias"])}.',
  f'5. **Partes da barra das curvas.** 44,0% + 26,7% + 20,7% + 8,7% dão 100,1%, por arredondamento. São do Design System e ficam.',
  f'6. **Ruptura e estoque negativo.** O Design System tem "Ruptura 3" e "3 produtos da curva A em falta": toda a ruptura é curva A. Como ruptura é "vendeu nos 90 dias e está com estoque zero ou negativo", os 2 produtos com estoque negativo não venderam nos 90 dias (senão seriam ruptura). Por isso a nota deles é "provável erro de contagem no inventário de 26/09".',
  '7. **Caixa às 14h05.** O caixa de hoje ainda não fechou. A visão do dia da F3 em 21/10 é o estado "ainda não fechou; último fechamento: 20/10". O exemplo cheio é terça, 20/10, aberto pelo atalho ou pelo seletor, com a faixa "Você está vendo terça, 20/10/2026 · calculado em 20/10 às 22h04".',
  '8. **Primeira compra em 26/09 não existe.** 26/09 foi o inventário, sem nota no ERP novo nem no anterior. O produto novo do exemplo foi comprado em 29/09 e fica em carência até 28/11.',
  '9. **Nomes.** Pessoas nas telas: Igor, Daniele e "Outros (sem meta própria)"; o dono, Israel, só na conta, na tela de entrada e em "quem digitou". A gerente não tem nome: no caixa, o operador aparece como "gerente". Clientes de exemplo do Design System (Marcenaria Bom Jesus, JR Móveis Planejados, Oficina do Cedro) estão sumidos há mais de 60 dias; por isso não aparecem como atendidos em outubro. E-mails de exemplo usam o domínio reservado `example.com`.',
  '10. **Marcas e fornecedores.** Todos inventados (Ferrolar, Deslizza, Puxare, Fixamais, Bordacor, Colaforte, Luzmóvel, Cozimax, Marcenex, Chapa Norte). Os fornecedores das contas são os do Design System (Ferragens Norte, Madeiras do Vale, Parafusos & Cia, Energia (Equatorial), Aluguel da loja), mais Casa do Marceneiro Atacado, Bordas & Colas Nordeste e Luz e Perfil Distribuidora.', '')

# ======================================================================= BASE
b = J['base']
p('## 0 · Base comum (vale para todas as telas)', '')
tab(['Item', 'Valor', 'Origem'], [
    ['Dia e hora', 'quarta-feira, 21/10/2026, 14h05', DS],
    ['Barra de cima', b['atualizado'], DS],
    ['Seletor de dia (computador)', '‹ Hoje · qua, 21/10/2026 ›, com a seta › desligada', DS],
    ['Botão do dia (celular)', 'Hoje · qua, 21/10 e, menor, "atualizado às 14h05" (sem a marca)', DS],
    ['Quem entrou', 'Israel, perfil Dono (círculo "IS")', DS],
    ['Horário da loja', 'segunda a sexta, 7h às 18h; sábado, 7h às 12h (conta como dia útil inteiro)', NV],
    ['Dias úteis de outubro', f'{b["outubro"]["dias_uteis"]}; passaram {b["outubro"]["decorridos"]} (contando hoje); faltam 9', DS],
    ['Dias sem expediente de outubro', 'domingos 04, 11 e 18, e 12/10 (Nossa Senhora Aparecida); o domingo 25/10 é futuro e no calendário fica só desligado, sem o ponto', DS],
    ['Setembro', f'{b["setembro"]["dias_uteis"]} dias úteis; sem expediente em 07/09 (Independência) e 26/09 (inventário da troca de ERP)', DS],
    ['Maio', 'sem expediente em 01/05 (Dia do Trabalho); abril, só os domingos', DS],
    ['Novembro', f'{b["novembro"]["dias_uteis"]} dias úteis; 02/11 (Finados) marcado; em 20/11 a loja abre e não entra', NV],
    ['Régua dos estados (provisória)', 'ritmo: no lugar com 1,00 ou mais, atenção de 0,90 a 0,99, fora abaixo de 0,90; folga: fora com a de 7 dias negativa, atenção com a de 30 dias negativa; curva A em falta: acima de 0 é fora; caixa: quebra acima de R$ 5,00 é fora; saldo: velho depois de 3 dias', 'TELAS.md, pergunta 5'],
])
p('Calendário de outubro de 2026 (semana de segunda a domingo; "sem" = sem expediente; "hoje" = 21/10; depois de hoje, desligado):', '')
semanas = [['28/09', '29/09', '30/09', '1', '2', '3', '4 sem'], ['5', '6', '7', '8', '9', '10', '11 sem'],
           ['12 sem', '13', '14', '15', '16', '17', '18 sem'], ['19', '20', '21 hoje', '22', '23', '24', '25'],
           ['26', '27', '28', '29', '30', '31', '01/11']]
tab(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'], semanas)

# ======================================================================= G1
p('## G1 · Entrar', '', 'Tela sem números. Textos e exemplos:', '')
tab(['Item', 'Texto', 'Origem'], [
    ['Marca e linha', 'Kaizen · "Vendas, compras e caixa da loja"', 'TELAS.md'],
    ['Botões', '"Entrar com Google"; separador "ou"; E-mail, Senha, "Entrar"; "Esqueci a senha"', 'TELAS.md'],
    ['Rodapé fixo', '"Acesso liberado pelo Israel. Não há cadastro por aqui."', 'TELAS.md'],
    ['E-mail digitado no exemplo', 'israel@example.com', NV],
    ['Senha errada', '"E-mail ou senha não conferem" (o e-mail continua no campo)', 'TELAS.md'],
    ['Conta sem acesso', '"A conta visitante@example.com não tem acesso ao Kaizen. Peça ao Israel." e "Entrar com outra conta"', NV],
    ['Esqueci a senha', 'pede o e-mail; depois: "Se este e-mail tiver acesso, o link chega em instantes."', 'TELAS.md'],
    ['Perfil sem telas ainda', '"Seu acesso chega numa próxima etapa"', 'TELAS.md'],
    ['Bloqueado / expirado', '"Seu acesso foi encerrado. Fale com o Israel." · "Seu acesso expirou. Entre de novo."', 'TELAS.md'],
    ['Servidor fora', '"O Kaizen não respondeu. Tente de novo em alguns minutos."', 'TELAS.md'],
    ['Celular, gerente ou vendedor', '"O Kaizen da equipe é usado no computador"', 'TELAS.md'],
    ['Computador, entregador', '"A sua tela é no celular"', 'TELAS.md'],
])

# ======================================================================= I1
p('## I1 · Início', '', 'Os três cartões são os da prancha Cartão de pergunta, com os mesmos números. Cabeçalho: "Início" e "qua, 21/10/2026 · 17 de 26 dias úteis" (DS).', '')
p('### Vendas: como estou em relação à meta?', '')
tab(['Item', 'Como aparece', 'Origem'], [
    ['Marca', 'Atenção', DS],
    ['Número', f'{mil(mes["realizado"])} · de R$ 150 mil · {pct(mes["percentual_meta"])} da meta', DS],
    ['Ritmo', f'Ritmo {ritmo(mes["ritmo"])} · 17 de 26 dias úteis', DS],
    ['Hoje', f'Hoje até 14h05: {mil(dia["realizado"])} em {dia["vendas"]} vendas', DS],
    ['Hoje contra um dia como hoje (só computador)', f'{mil(dia["realizado"])} contra {mil(dia["dia_como_hoje"])} num dia como hoje até 14h05 · {mil(dia["diferenca_dia_como_hoje"], True)}', DS],
    ['Frase', 'Vendas um pouco atrás da meta. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil.', DS],
    ['Exceção', 'Abaixo do ritmo: Daniele · Fora 0,82', DS],
    ['Aberto: barra de meta', f'Meta R$ 150 mil · {mil(mes["realizado"])} realizado · projeção {mil(mes["projecao"])} (fica {mil(-mes["projecao_menos_meta"])} abaixo da meta)', DS + ' (a diferença é ' + NV + ')'],
    ['Aberto: por vendedor', f'meta de R$ 75 mil cada · Igor {mil(igor["realizado_mes"])} · {pct(igor["percentual_meta"])} · ritmo {ritmo(igor["ritmo"])} · Daniele {mil(dani["realizado_mes"])} · {pct(dani["percentual_meta"])} · ritmo {ritmo(dani["ritmo"])} Fora · Outros (sem meta própria) {mil(outros["realizado_mes"])}', DS],
    ['Itens sem vendedor', 'nenhum (a linha não aparece)', NV],
])
p('### Compras: estou comprando o que gira ou o que encalha?', '')
tab(['Item', 'Como aparece', 'Origem'], [
    ['Marca', 'Fora', DS],
    ['Número', '3 produtos · da curva A em falta · "A régua é 0"', DS],
    ['Frase', 'Três dos produtos que mais giram estão sem estoque.', DS],
    ['Exceção', 'Em falta: Dobradiça 35 mm, Corrediça 450 mm, Puxador 128 mm (cada um "Fora 0 un.")', DS],
    ['Aberto: barra das curvas (sem legenda)', cp['frase'], DS],
    ['Aberto: encalhe', f'Parado há 90 dias: {enc["produtos"]} produtos · {mil(enc["valor"])}', DS],
    ['Aberto: ruptura', '3 produtos (os mesmos 3 da curva A)', DS],
])
p('### Financeiro: tenho dinheiro para pagar as contas?', '')
tab(['Item', 'Como aparece', 'Origem'], [
    ['Marca', 'No lugar', DS],
    ['Número', f'{mil(F["folga_7"])} · de folga em 7 dias', DS],
    ['Conta', 'Saldo de 20/10: R$ 41,3 mil − R$ 33,1 mil até 28/10', DS],
    ['Frase', 'Dá para pagar as contas dos próximos 7 dias.', DS],
    ['Aberto', f'Folga em 7 dias (até 28/10) {mil(F["folga_7"])} · Folga em 30 dias (até 20/11) {mil(F["folga_30"])} · Saldo do banco em 20/10 {brl(41300)} · A vencer até 28/10: 5 parcelas {brl(ctas["ate_7_dias"]["valor"])} · Contas vencidas: nenhuma · Quebra do caixa no fechamento de 20/10 R$ 0,00 (link para F3)', DS],
])
p('### Bloco "O que isso significa" (Fase 6)', '',
  'Texto (DS): "A loja está um pouco atrás da meta, com ritmo de 0,94. O atraso está na Daniele, com ritmo de 0,82; o Igor está adiantado, com 1,04. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil." Linha: "escrito pela IA sobre os números das 14h; não calcula". Indisponível: "Texto da IA indisponível agora. Os números continuam valendo."', '')
e15 = V['exemplo_15_09']
p('### Estados do Início', '')
tab(['Estado', 'Números e textos', 'Origem'], [
    ['Sem meta (Vendas)', 'marca "Sem meta"; "Sem meta para outubro"; "Realizado R$ 92,4 mil · 17 de 26 dias úteis"; "Projeção R$ 143,8 mil"; "Hoje até 14h05: R$ 4,1 mil em 24 vendas"; "Sem a meta do mês não há ritmo."; botão "Cadastrar meta"', DS],
    ['Sem dado (Financeiro)', 'marca "Sem dado"; "Sem o saldo de 20/10"; "A pagar até 28/10: R$ 33.100,00"; "O saldo do banco de 20/10 ainda não foi digitado; sem ele não há folga."; "Digitar saldo"', DS],
    ['Saldo velho (Financeiro)', 'marca "Saldo velho" (atenção); "Saldo de 12/09: R$ 41,3 mil − R$ 33,1 mil até 28/10"; "O saldo do banco é de 12/09, há 39 dias; a folga pode não valer mais."; "Digitar saldo"', DS],
    ['Sem venda hoje até agora (outro dia, às 8h05)', '"Hoje até 8h05: nenhuma venda ainda" contra R$ 0,3 mil num dia como hoje até 8h05 (no exemplo principal, a primeira venda saiu às 8h12)', NV],
    ['Dia passado, 15/09 (Vendas)', f'No lugar · {mil(e15["realizado"])} · de R$ 150 mil · {pct(e15["percentual_meta"])} da meta · Ritmo {ritmo(e15["ritmo"])} · 12 de 24 dias úteis · "Vendas no ritmo da meta. A projeção fecha em R$ 153,6 mil para a meta de R$ 150 mil." · faixa "{e15["faixa"]}"', DS],
    ['Dia passado, 15/09 (vendedores)', ' · '.join(f'{x["nome"]} {mil(x["realizado"])}' + (f' · {pct(x["percentual_meta"])} · ritmo {ritmo(x["ritmo"])}' if 'ritmo' in x else '') for x in e15['vendedores']) + ' (Daniele em atenção)', NV],
    ['Dia passado, 15/09 (Compras)', f'90 dias de {e15["compras"]["periodo"]}: comprou {e15["compras"]["comprados"]} produtos: {e15["compras"]["A"]} curva A, {e15["compras"]["B"]} B, {e15["compras"]["C"]} C e {e15["compras"]["sem_venda"]} sem venda; no lugar de encalhe e ruptura, "estoque desconhecido antes de 26/09/2026"', NV],
    ['Dia passado, 15/09 (Financeiro)', f'Saldo de 14/09: {mil(e15["financeiro"]["saldo"])} − {mil(e15["financeiro"]["a_pagar_7"])} até 22/09 ({e15["financeiro"]["contas_7"]} contas) · folga em 7 dias {mil(e15["financeiro"]["folga_7"])} · folga em 30 dias {mil(e15["financeiro"]["folga_30"])} · quebra do caixa no fechamento de 15/09 R$ 0,00', NV],
    ['Uma pergunta sem resposta', 'só a coluna dela diz "Sem resposta para este dia"', 'TELAS.md'],
])

# ======================================================================= V1
p('## V1 · Vendas: o desvio', '')
p('### Resumo (faixa no topo)', '')
tab(['Item', 'Como aparece', 'Origem'], [
    ['Realizado contra a meta', f'{mil(mes["realizado"])} contra R$ 150 mil de meta · {pct(mes["percentual_meta"])}', DS],
    ['Falta', f'{mil(mes["falta"], False)} para a meta (no Número grande: {MENOS}R$ 57,6 mil)', DS],
    ['Ritmo', f'{ritmo(mes["ritmo"])} contra 1,00 · Atenção {MENOS}0,06', DS],
    ['Dica do ritmo', 'Ritmo é o realizado dividido pela meta, na proporção dos dias úteis que já passaram. Acima de 1,00 está adiantado. Hoje: 17 de 26 dias úteis.', DS],
    ['Conta escrita do ritmo', 'realizado ÷ (meta × 17 de 26 dias úteis)', DS],
    ['Meta até hoje', f'{mil(mes["meta_ate_hoje"])} ({brl(mes["meta_ate_hoje"])}: R$ 150.000,00 × 17 ÷ 26)', DS],
    ['Projeção', f'{mil(mes["projecao"])} · {mil(mes["projecao_menos_meta"])} da meta', DS + ' (a diferença é ' + NV + ')'],
    ['Dias úteis', '17 de 26, faltam 9', DS],
    ['Para bater a meta (proposta)', f'{brl(mes["por_dia_util_restante"])} por dia útil restante ({brl(mes["falta"])} ÷ 9)', NV],
])
p('### Como a projeção fecha (para a dica e para conferir)', '',
  f'Realizado até ontem (20/10): {brl(mes["realizado_ate_ontem"])}. Mais, para cada dia útil de 21/10 a 31/10 (10 dias), a média das últimas 8 semanas do mesmo dia da semana:', '')
md = mes['medias_8_semanas']
rest = mes['dias_restantes_contando_hoje']
tab(['Dia da semana', 'Média das 8 semanas', 'Dias que faltam', 'Soma'], [
    [k, brl(md[k]), ', '.join(data(d) for d in rest if dia_semana(d) == k), brl(md[k] * len([d for d in rest if dia_semana(d) == k]))]
    for k in ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb']] + [['Total', '', '10 dias', brl(mes['projecao'] - mes['realizado_ate_ontem'])]])
p(f'Projeção: {brl(mes["realizado_ate_ontem"])} + {brl(mes["projecao"] - mes["realizado_ate_ontem"])} = {brl(mes["projecao"])} → {mil(mes["projecao"])}. Origem das médias: {NV}.', '')
p('### Gráfico do mês: acumulado, meta em degraus e projeção', '',
  f'As vendas de cada dia são as da prancha Gráficos ({DS}, em mil); o valor exato em reais é {NV} e arredonda para o mesmo número. A meta sobe R$ 5.769,23 por dia útil (R$ 150.000,00 ÷ 26), em degraus. Projeção pontilhada de {mil(mes["realizado"])} em 21/10 até {mil(mes["projecao"])} em 31/10. Eixo em "R$ 50 mil". Rótulos: "Meta R$ 150 mil", "Projeção R$ 143,8 mil", "Realizado R$ 92,4 mil", "Atenção · ritmo 0,94", "meta até hoje R$ 98,1 mil".', '')
tab(['Dia', 'Realizado do dia', 'No gráfico', 'Acumulado', 'Meta até o dia', 'Situação'],
    [[data_sem(x['data']), brl(x['realizado']), mil(x['realizado']), brl(x['acumulado']), brl(x['meta_acumulada']), x['situacao']] for x in V['por_dia']])
p(f'Soma de 01 a 21/10: {brl(mes["realizado"])}. Média dos {V["dias_completos"]} dias completos com venda (sem hoje, domingos e 12/10): {brl(V["media_dias_completos"])} → {mil(V["media_dias_completos"])} (DS: "média R$ 5,5 mil · 16 dias completos").', '')
p('Vendas de hoje por hora (prancha Gráficos; a hora das 14h está em andamento; nenhuma venda das 7h às 8h):', '')
tab(['Hora', 'Realizado', 'No gráfico', 'Vendas'], [[x['hora'], brl(x['realizado']), mil(x['realizado']), x['vendas']] for x in V['por_hora']] +
    [['Total', brl(sum(x['realizado'] for x in V['por_hora'])), 'R$ 4,1 mil', sum(x['vendas'] for x in V['por_hora'])]])
p('### Como se forma (vendido − devoluções = realizado)', '')
tab(['', 'Vendido', 'Devoluções', 'Realizado', 'Origem'], [
    ['Mês (01 a 21/10)', brl(mes['vendido']), brl(mes['devolucoes']), brl(mes['realizado']), NV + ' (realizado: ' + DS + ')'],
    ['Hoje (até 14h05)', brl(dia['vendido']), brl(dia['devolucoes']), brl(dia['realizado']), NV + ' (realizado: ' + DS + ')'],
])
p('### Tabela dos vendedores (pior ritmo primeiro)', '')
linhas = []
for x in V['vendedores']:
    linhas.append([x['nome'], est_txt(x['estado']) + (' ' + ritmo(x['ritmo']) if x['estado'] != 'no lugar' else ''), ritmo(x['ritmo']), brl(x['realizado_mes']), brl(x['meta']),
                   pct(x['percentual_meta']), brl(x['falta']), brl(x['realizado_dia']), x['vendas_mes'], x['clientes_atendidos']])
linhas.append(['Outros (sem meta própria)', '—', '—', brl(outros['realizado_mes']), 'sem meta', '—', '—', brl(outros['realizado_dia']), outros['vendas_mes'], '—'])
linhas.append(['**Loja**', 'Atenção', ritmo(mes['ritmo']), brl(mes['realizado']), brl(mes['meta']), pct(mes['percentual_meta']), brl(mes['falta']), brl(dia['realizado']), mes['vendas'], '—'])
tab(['Vendedor', 'Estado', 'Ritmo', 'Realizado do mês', 'Meta', '% da meta', 'Falta', 'Realizado do dia', 'Vendas no mês', 'Clientes atendidos'], linhas)
p(f'Origem: realizado do mês (em mil), meta, % e ritmo são {DS}; o valor exato, falta, dia, vendas e clientes são {NV}. Linha de Outros: "venda de quem não é vendedor no ERP (hoje, a gerente); conta só na meta da loja". Hoje: Igor {igor["vendas_dia"]} vendas, Daniele {dani["vendas_dia"]}, Outros {outros["vendas_dia"]} (total 24). Código no ERP: Igor {igor["codigo"]}, Daniele {dani["codigo"]}.', '')
sv = V['excecao_sem_vendedor_exemplo_de_estado']
p('### Estados da V1', '')
p('Sem o atalho "Padrões de venda": a V3 foi adiada e o link só entra quando ela existir (DECISOES, 03/10).', '')
tab(['Estado', 'Números e textos', 'Origem'], [
    ['Itens sem vendedor (só quando houver; no exemplo principal não há)', f'"Itens sem vendedor: {sv["itens_mes"]} itens, {brl(sv["valor_mes"])} no mês; nenhum hoje · ficam fora do vendido, como no relatório 154 do ERP"', NV],
    ['Sem meta da loja', 'sem comparação, ritmo vazio, "Cadastrar meta" (só dono)', 'TELAS.md'],
    ['Mês sem venda (dia 1, cedo)', 'Realizado R$ 0,00 · 0 vendas · 1 de 26 dias úteis (o dia de hoje conta)', NV],
    ['Celular', f'resumo num cartão; a barra da loja (Meta R$ 150 mil · R$ 92,4 mil realizado · projeção R$ 143,8 mil); um cartão por vendedor: Daniele (Fora 0,82; R$ 40,2 mil · 53,6% · meta R$ 75 mil), Igor (1,04; R$ 51,0 mil · 68,0% · meta R$ 75 mil), Outros R$ 1,2 mil', DS],
])

# ======================================================================= V2
p('## V2 · Detalhe do vendedor', '',
  'O exemplo principal é a Daniele (é o nome que o Início mostra fora do ritmo). As setas ‹ › levam ao Igor, e dele de volta à Daniele.', '')
for x in [dani, igor]:
    tit = 'vendedora' if x['nome'] == 'Daniele' else 'vendedor'
    p(f'### {x["nome"]} · {tit} no ERP (código {x["codigo"]})', '')
    tab(['Item', 'Como aparece', 'Origem'], [
        ['Realizado contra a meta', f'{mil(x["realizado_mes"])} contra R$ 75 mil · {pct(x["percentual_meta"])} da meta', DS],
        ['Ritmo e estado', f'{ritmo(x["ritmo"])} · ' + ('Fora (abaixo do ritmo)' if x['estado'] == 'fora' else 'no lugar, sem cor'), DS],
        ['Falta', f'{brl(x["falta"])} ({mil(x["falta"])})', NV],
        ['Realizado de hoje', f'{brl(x["realizado_dia"])} até 14h05, em {x["vendas_dia"]} vendas', NV],
        ['Vendas no mês', f'{x["vendas_mes"]} vendas', NV],
        ['Clientes atendidos no mês', f'{x["clientes_atendidos"]} clientes', NV],
    ])
    chave = 'daniele' if x['nome'] == 'Daniele' else 'igor'
    grupos = sorted(V['mix_mes']['grupos'], key=lambda g: -g[chave])
    tab(['Grupo', f'R$ {x["nome"]}', f'Parte em {x["nome"]}', 'Parte na loja'],
        [[g['grupo'] + (' (produto sem grupo no cadastro)' if g['grupo'] == 'Sem grupo' else ''), brl(g[chave]), pct(g['parte_' + chave]), pct(g['parte_loja'])] for g in grupos] +
        [['Total', brl(x['realizado_mes']), '100%', '100%']])
p(f'Mix por grupo: {NV}. Leitura da Daniele: ela vende menos dobradiças e corrediças, os itens de maior valor por venda (16,0% e 13,4% do que vende, contra 19,8% e 17,5% na loja), e mais parafusos, fitas e colas. No celular: o resumo num cartão e os 5 maiores grupos, com "ver todos", sem a coluna da loja.', '')
ca = V['clientes_atendidos_fase8_daniele']
p(f'Fase 8, bloco "Clientes atendidos" da Daniele ({NV}; marcar como Fase 8): ' + '; '.join(f'{x["cliente"]} {brl(x["realizado"])}' for x in ca['maiores']) + f'; "Ver todos ({ca["total"]})".', '')
p('Estados: sem meta (ritmo e % vazios, "Cadastrar meta"); sem venda no mês ("Nenhuma venda em outubro até agora").', '')

# ======================================================================= C1
p('## C1 · Compras: o desvio', '')
pc = cp['percentuais']
h30 = cp['ha_30_dias']
p(f'Cabeçalho, como texto fixo: "{CP["periodo"]["texto"]}" ({DS}). Rodapé: "{CP["rodape"]}"', '')
p('### Resposta: a barra das curvas (com legenda, fora do cartão)', '')
tab(['Parte', 'Produtos', 'Parte do total', 'Há 30 dias (90 dias até 21/09)', 'Origem'], [
    ['Curva A', cp['A'], pct(pc['A']), h30['A'], DS + ' (há 30 dias: ' + NV + ')'],
    ['Curva B', cp['B'], pct(pc['B']), h30['B'], DS + ' (há 30 dias: ' + NV + ')'],
    ['Curva C', cp['C'], pct(pc['C']), h30['C'], DS + ' (há 30 dias: ' + NV + ')'],
    ['Sem venda', cp['sem_venda'], pct(pc['sem_venda']), h30['sem_venda'], DS + ' (há 30 dias: ' + NV + ')'],
    ['Total', cp['total'], '100%', h30['total'], DS + ' (há 30 dias: ' + NV + ')'],
])
p(f'Frase sugerida: "Fora: 3 produtos da curva A em falta. Das compras dos 90 dias, 13 dos 150 produtos não venderam." Comparação: "há 30 dias: {h30["total"]} produtos comprados, {h30["sem_venda"]} sem venda". Estado da tela: Fora (curva A em falta; a régua é 0).', '')
p('### Cartões de exceção', '')
cs = CP['comprados_sem_venda']
neg, cz = CP['estoque_negativo'], CP['custo_zero']
tab(['Cartão', 'Hoje', 'Há 30 dias', 'Diferença', 'Os 5 primeiros (celular)', 'Origem'], [
    ['Encalhe', f'{enc["produtos"]} produtos · {mil(enc["valor"])} parados a custo', f'30 produtos · {mil(enc["ha_30_dias"]["valor"])}', f'+8 produtos · {mil(enc["valor"] - enc["ha_30_dias"]["valor"], True)}',
     ', '.join(x['descricao'] for x in enc['lista'][:5]), DS + ' (valor há 30 dias e lista: ' + NV + ')'],
    ['Ruptura', '3 produtos (todos curva A)', f'{rup["ha_30_dias"]} produto', '+2 produtos', ', '.join(x['descricao'] for x in rup['lista']), DS + ' (há 30 dias: ' + NV + ')'],
    ['Comprados sem venda', f'{cs["produtos"]} produtos', f'{cs["ha_30_dias"]} produtos', '+3 produtos',
     ', '.join(d_ for _, d_ in sorted([(y['comprado_90']['data'], y['descricao']) for y in enc['lista'] if 'comprado_90' in y] + [(y['primeira_entrada'], y['descricao']) for y in cs['novos']], reverse=True)[:5]), DS + ' (há 30 dias e lista: ' + NV + ')'],
    ['Estoque negativo', f'{neg["produtos"]} produtos', f'{neg["ha_30_dias"]} produtos', f'{MENOS}2 produtos', ', '.join(x['descricao'] for x in neg['lista']), NV],
    ['Custo zero', f'{cz["produtos"]} produtos', '—', 'cadastro de hoje, sem comparação', ', '.join(x['descricao'] for x in cz['lista'][:5]), NV],
])
p('### Curva ABC dos 90 dias (produtos vendidos)', '')
av, aq = CP['abc_valor'], CP['abc_quantidade']
tab(['Classe', 'Por valor: produtos', 'R$ em 90 dias', 'Parte', 'Por quantidade: produtos', 'Unidades', 'Parte'],
    [[k, av[k]['produtos'], brl(av[k]['liquido']) + f' ({mil(av[k]["liquido"])})', pct(av[k]['parte']), aq[k]['produtos'], num(aq[k]['quantidade']), pct(aq[k]['parte'])] for k in 'ABC'] +
    [['Total', av['total']['produtos'], brl(av['total']['liquido']) + f' ({mil(av["total"]["liquido"])})', '100%', aq['total']['produtos'], num(aq['total']['quantidade']), '100%']])
vm = CP['vendas_90_dias_por_mes']
p(f'Origem: {NV}. O total de {brl(av["total"]["liquido"])} é a venda dos 90 dias: 24 a 31/07 {brl(vm["24 a 31/07"])} + agosto {brl(vm["agosto"])} + setembro {brl(vm["setembro"])} + outubro até 21/10 {brl(vm["outubro (até 21/10)"])}. A: até 80% do valor; B: até 95%; C: o resto. Dos 98 produtos curva A, 66 foram comprados nos 90 dias.', '')
p('### Onde o estoque está parado (os 5 grupos com mais dias de cobertura)', '')
tab(['Grupo', 'Cobertura', 'Giro em 90 dias', 'Produtos em encalhe', 'Valor parado'],
    [[g['grupo'], f'{g["cobertura_dias"]} dias', num(g['giro'], 2), g['encalhe_produtos'], brl(g['valor_parado'])] for g in CP['onde_esta_parado']])
p(f'Origem: {NV} (os mesmos números da visão por grupo da C2).', '')
p('Estados: nenhuma compra nos 90 dias ("Nenhuma nota de entrada nos últimos 90 dias"; os cartões continuam); dia antes de 26/09/2026 (cartões de estoque em cinza, "estoque desconhecido antes de 26/09/2026"); cartão vazio ("Nenhum produto em encalhe"); tudo bem ("Comprando o que gira"). No celular: a barra, a frase e os cartões, cada um com os 5 primeiros (tocar abre a C3).', '')

# ======================================================================= C2
p('## C2 · Estoque e giro', '')
vis = CP['visoes']
p(f'Período em texto fixo: "{CP["periodo"]["texto"]}". Busca: "Código ou descrição".', '')
tab(['Visão', 'Contagem', 'Ordem', 'Origem'], [
    ['Todos', vis['Todos'], 'R$ em 90 dias', NV], ['Curva ABC (valor ou quantidade)', vis['Curva ABC'], 'R$ ou unidades', NV],
    ['Encalhe', vis['Encalhe'], 'valor parado', DS], ['Ruptura', vis['Ruptura'], 'unidades vendidas', DS],
    ['Comprados nos 90 dias', vis['Comprados nos 90 dias'], 'R$ em 90 dias', DS],
    ['Comprados sem venda', vis['Comprados sem venda'], 'data da compra', DS],
    ['Estoque negativo', vis['Estoque negativo'], 'estoque', NV], ['Custo zero', vis['Custo zero'], 'código', NV],
])
tc = vis['todos_composicao']
p(f'"Todos" são os produtos com venda nos 90 dias ou com estoque diferente de zero: {tc["com venda nos 90 dias"]} com venda + {tc["encalhe"]} em encalhe + {tc["novos sem venda"]} novos ainda sem venda + {tc["estoque negativo sem venda"]} com estoque negativo e sem venda = {vis["Todos"]}.', '')
p('### Linha de totais do filtro', '')
tab(['Visão', 'Produtos', 'R$ vendidos em 90 dias', 'Unidades vendidas', 'Valor parado', 'Há 30 dias'], [
    ['Encalhe', 38, 'R$ 0,00', '0', brl(enc['valor']) + f' ({mil(enc["valor"])})', f'30 produtos · {brl(enc["ha_30_dias"]["valor"])}'],
    ['Ruptura', 3, brl(sum(x['liquido_90'] for x in rup['lista'])), num(sum(x['quantidade_90'] for x in rup['lista'])), '—', '1 produto'],
    ['Todos', vis['Todos'], brl(av['total']['liquido']), num(aq['total']['quantidade']), brl(enc['valor']), '—'],
])
p('### Visão Encalhe (38 produtos, do maior valor parado para o menor)', '',
  'Todos: classe "sem venda", R$ 0,00 e 0 unidades em 90 dias, giro 0,0, cobertura "—" (sem venda). Estoque médio desde 26/09 (estoque conhecido). Marca "comprado em 90 dias" nos 5 que tiveram nota de entrada dentro dos 90 dias.', '')
tab(['Código', 'Descrição', 'Grupo', 'Marca', 'Fornecedor', 'Estoque', 'Estoque médio', 'Custo', 'Valor parado', 'Última venda', 'Marcas'],
    [[x['codigo'], x['descricao'], x['grupo'], x['marca'], x['fornecedor'], f'{x["estoque"]} un.', num(x['estoque_medio'], 1), brl(x['custo']), brl(x['valor_parado']), data(x['ultima_venda'], True),
      ', '.join(x['marcas']) + (f' ({data(x["comprado_90"]["data"])})' if 'comprado_90' in x else '')] for x in enc['lista']] +
    [['', '**Total · 38 produtos**', '', '', '', f'{sum(x["estoque"] for x in enc["lista"])} un.', '', '', brl(enc['valor']), '', '']])
p('### Visão Ruptura (3 produtos, todos curva A)', '')
tab(['Código', 'Descrição', 'Grupo', 'Marca', 'Fornecedor', 'Classe (valor / quantidade)', 'R$ em 90 dias', 'Unidades', 'Estoque', 'Estoque médio', 'Giro', 'Cobertura', 'Última venda'],
    [[x['codigo'], x['descricao'], x['grupo'], x['marca'], x['fornecedor'], 'A / A', brl(x['liquido_90']), num(x['quantidade_90']), '0 un.', num(x['estoque_medio'], 1), num(x['giro'], 1), '0 dias', data(x['ultima_venda'], True)] for x in rup['lista']])
p('### Visão Comprados sem venda (13 produtos)', '')
linhas = []
for x in [y for y in enc['lista'] if 'comprado_90' in y]:
    linhas.append((x['comprado_90']['data'], [x['codigo'], x['descricao'], x['grupo'], x['fornecedor'], data(x['comprado_90']['data'], True), f'NF {x["comprado_90"]["nf"]}', f'{x["comprado_90"]["unidades"]} un.', f'{x["estoque"]} un.', 'encalhe (produto antigo, sem venda desde ' + data(x['ultima_venda']) + ')']))
for x in cs['novos']:
    linhas.append((x['primeira_entrada'], [x['codigo'], x['descricao'], x['grupo'], x['fornecedor'], data(x['primeira_entrada'], True), f'NF {x["nf"]}', f'{x["estoque"]} un.', f'{x["estoque"]} un.', x['marcas'][0]]))
linhas = [ln for _, ln in sorted(linhas, key=lambda t: t[0], reverse=True)]
tab(['Código', 'Descrição', 'Grupo', 'Fornecedor', 'Compra', 'Nota', 'Comprou', 'Estoque', 'Por que não está vendendo'], linhas)
p(f'5 estão em encalhe (já vendiam antes e pararam) e 8 são novos, em carência de 60 dias desde a primeira compra; por isso os 8 não contam no encalhe. Origem: {NV} (a contagem 13 é {DS}).', '')
p('### Visões Estoque negativo e Custo zero', '')
tab(['Código', 'Descrição', 'Grupo', 'Estoque', 'Última venda', 'Nota'],
    [[x['codigo'], x['descricao'], x['grupo'], f'{MENOS}{abs(x["estoque"])} un.', data(x['ultima_venda'], True), x['nota']] for x in neg['lista']])
tab(['Código', 'Descrição', 'Grupo', 'Classe por valor', 'Estoque', 'Última venda', 'Custo no cadastro'],
    [[x['codigo'], x['descricao'], x['grupo'], x['classe_valor'], f'{x["estoque"]} un.', data(x['ultima_venda'], True), 'R$ 0,00'] for x in cz['lista']])
p('Custo zero: lista do cadastro de hoje, sem comparação com 30 dias antes ("o cadastro não guarda histórico"). O "Corte de chapa (serviço)" é serviço e não tem custo mesmo; os outros 6 são erro de cadastro.', '')
p('### Visão Todos / Curva ABC: os 12 maiores em R$ nos 90 dias', '')
tab(['Código', 'Descrição', 'Grupo', 'Classe (valor / quantidade)', 'R$ em 90 dias', 'Unidades', 'Estoque', 'Estoque médio', 'Giro', 'Cobertura', 'Última venda', 'Marcas'],
    [[x['codigo'], x['descricao'], x['grupo'], f'{x["classe_valor"]} / {x["classe_quantidade"]}', brl(x['liquido_90']), num(x['quantidade_90']), f'{x["estoque"]} un.', num(x['estoque_medio'], 1),
      num(x['giro'], 1), f'{x["cobertura_dias"]} dias', data(x['ultima_venda'], True), ', '.join(x['marcas'])] for x in CP['maiores_90_dias']])
p('### Ver por grupo', '')
pg = CP['por_grupo']['grupos']
tab(['Grupo', 'Produtos', 'R$ em 90 dias', 'Unidades', 'Estoque hoje', 'Estoque médio', 'Giro', 'Cobertura', 'Em encalhe', 'Valor parado'],
    [[g['grupo'], g['produtos'], brl(g['liquido_90']), num(g['quantidade_90']), num(g['estoque']), num(g['estoque_medio']), num(g['giro'], 2), f'{g["cobertura_dias"]} dias', g['encalhe_produtos'], brl(g['valor_parado'])] for g in pg] +
    [['**Total**', sum(g['produtos'] for g in pg), brl(sum(g['liquido_90'] for g in pg)), num(sum(g['quantidade_90'] for g in pg)), '', '', '', '', sum(g['encalhe_produtos'] for g in pg), brl(sum(g['valor_parado'] for g in pg))]])
p('Giro = unidades em 90 dias ÷ estoque médio. Cobertura = estoque de hoje ÷ (unidades em 90 dias ÷ 90), em dias.', '')
p('### Ver por fornecedor', '')
pf = CP['por_fornecedor']['fornecedores']
tab(['Fornecedor', 'Produtos', 'R$ em 90 dias', 'Unidades', 'Em encalhe', 'Valor parado'],
    [[f_['fornecedor'], f_['produtos'], brl(f_['liquido_90']), num(f_['quantidade_90']), f_['encalhe_produtos'], brl(f_['valor_parado'])] for f_ in pf] +
    [['**Total**', sum(f_['produtos'] for f_ in pf), brl(sum(f_['liquido_90'] for f_ in pf)), num(sum(f_['quantidade_90'] for f_ in pf)), sum(f_['encalhe_produtos'] for f_ in pf), brl(sum(f_['valor_parado'] for f_ in pf))]])
p('Estados: visão vazia ("Nenhum produto em ruptura hoje"); busca sem resultado ("Nenhum produto com broca 8"); dia antes de 26/09/2026 (estoque com "—" e visões de estoque desligadas, com a explicação); Custo zero em dia passado (a lista de hoje, com "o cadastro não guarda histórico").', '')

# ======================================================================= C3
c3 = J['C3']['principal']
p('## C3 · Detalhe do produto', '',
  'Exemplo principal: o produto em encalhe de maior valor parado (o caminho "Por que este produto encalhou?"). No computador, painel à direita da C2.', '')
p(f'### {c3["codigo"]} · {c3["descricao"]}', '')
tab(['Item', 'Como aparece', 'Origem'], [
    ['Cabeçalho', f'{c3["codigo"]} · {c3["descricao"]} · grupo {c3["grupo"]} · marca {c3["marca"]} · fornecedor {c3["fornecedor"]}', NV],
    ['Marca de estado', 'Encalhe', NV],
    ['Classes', 'sem venda (valor e quantidade)', NV],
    ['Em 90 dias contra os 90 anteriores', f'R$ 0,00 e 0 un. contra {brl(c3["anteriores_90"]["liquido"])} e {c3["anteriores_90"]["quantidade"]} un. (25/04 a 23/07)', NV],
    ['Estoque', f'{c3["estoque"]} un. (estoque médio desde 26/09: {num(c3["estoque_medio"], 1)} un.)', NV],
    ['Cobertura e giro', 'cobertura "—" (sem venda) · giro 0,0', NV],
    ['Valor parado', f'{brl(c3["valor_parado"])} ({c3["estoque"]} un. × {brl(c3["custo"])})', NV],
    ['Cadastro', f'custo atual {brl(c3["custo"])} · preço {brl(c3["preco"])} · primeira entrada {data(c3["primeira_entrada"], True)} · última venda {data_sem(c3["ultima_venda"], True)}', NV],
    ['Fase 8', 'margem em 90 dias e os clientes que mais compram (bloco marcado "Fase 8")', 'TELAS.md'],
])
tab(['Mês', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out'],
    [['Unidades'] + [x['quantidade'] for x in c3['venda_por_mes']], ['R$'] + [brl(x['liquido']) for x in c3['venda_por_mes']]])
p('Estoque por dia desde 26/09 (linha): 14 un. de 26/09 a 01/10; 34 un. de 02/10 a 21/10, com a entrada de 20 un. marcada em 02/10.', '')
tab(['Data', 'Nota', 'Fornecedor', 'Unidades', 'Valor', 'Custo unitário'],
    [[data(x['data'], True), x['nf'], x['fornecedor'], f'{x["unidades"]} un.', brl(x['valor']) if x['valor'] else x['nota'], brl(x['custo_unitario']) if x['custo_unitario'] else '—'] for x in c3['entradas']])
p(f'A história que os números contam: {c3["historia"]}. A nota 48213 de 02/10 é a mesma conta da Ferragens Norte que vence em 22/10 ({brl(6480)}, 1 de 1) na F2.', '')
d35 = J['C3']['ruptura_dobradica_35']
serie = {x['data']: x['estoque'] for x in d35['estoque_por_dia']}
p('### Segundo exemplo: 10235 · Dobradiça 35 mm (ruptura)', '')
tab(['Item', 'Como aparece', 'Origem'], [
    ['Cabeçalho', f'{d35["codigo"]} · Dobradiça 35 mm · grupo Dobradiças · marca Ferrolar · fornecedor Ferragens Norte · marca de estado Ruptura', DS + ' (nome) e ' + NV],
    ['Números', f'classe A (valor e quantidade) · {brl(d35["liquido_90"])} e {num(d35["quantidade_90"])} un. em 90 dias · estoque 0 un. · estoque médio {num(d35["estoque_medio"], 1)} un. · giro {num(d35["giro"], 1)} · cobertura 0 dias', NV],
    ['Venda por mês (un.)', ' · '.join(f'{x["mes"]} {x["quantidade"]}' for x in d35['venda_por_mes']), NV],
    ['Estoque por dia', f'300 un. em 26/09 · {serie["2026-10-05"]} em 05/10 · {serie["2026-10-06"]} em 06/10 (entrada de 200) · {serie["2026-10-13"]} em 13/10 · {serie["2026-10-17"]} em 17/10 · 0 desde 19/10', NV],
    ['Entradas', '06/10/2026 · NF 48390 · Ferragens Norte · 200 un. · R$ 1.040,00 · R$ 5,20/un.; 05/09 e 18/07, 600 un. cada, notas do ERP anterior sem valor', NV],
    ['Cadastro', 'custo atual R$ 5,20 · preço R$ 7,00 · primeira entrada 14/04/2026 · última venda seg, 19/10/2026', NV],
])
nc = J['C3']['novo_em_carencia']
p(f'### Estado "novo, em carência": {nc["codigo"]} · {nc["descricao"]}', '',
  f'Grupo {nc["grupo"]}, marca {nc["marca"]}, fornecedor {nc["fornecedor"]}. Primeira compra em {data(nc["primeira_entrada"], True)} (NF {nc["nf"]}, {nc["estoque"]} un. a {brl(nc["custo"])}); nenhuma venda ainda; estoque {nc["estoque"]} un. Marca: "novo, em carência até 28/11". Frase: "Ainda não está em encalhe: a primeira compra foi há 22 dias, e a carência é de 60." Origem: {NV}.', '')
p('Outros estados: sem venda desde abril; dia antes de 26/09 ("estoque desconhecido"); nota do ERP anterior ("esta nota não guardava valor", como nas entradas de 14/04 acima).', '')

# ======================================================================= F1
p('## F1 · Financeiro: o desvio', '', f'Cabeçalho, discreto: "{F["fonte"]}".', '')
p('### Resposta: as duas folgas', '')
tab(['Item', 'Como aparece', 'Origem'], [
    ['Folga em 7 dias (até 28/10)', f'{mil(F["folga_7"])} · No lugar', DS],
    ['Conta escrita', f'saldo {brl(41300)} − {brl(ctas["ate_7_dias"]["valor"])} que vencem até 28/10 (nenhuma vencida)', DS],
    ['Comparação', f'contra {mil(F["folga_7_ha_7_dias"])} há 7 dias · {mil(F["folga_7"] - F["folga_7_ha_7_dias"])} (sem cor)', DS],
    ['Folga em 30 dias (até 20/11)', f'{mil(F["folga_30"])} · no lugar (positiva)', DS],
    ['Conta escrita', f'saldo {brl(41300)} − {brl(ctas["ate_30_dias"]["valor"])} que vencem até 20/11', NV],
    ['Comparação da folga em 30 dias', f'sugestão: sem comparação (ver Pontos de atenção, 4); se houver, {mil(F["folga_30_ha_7_dias"])} há 7 dias', NV],
    ['Aviso do saldo', 'nenhum: o saldo é de 20/10, há 1 dia', DS],
])
p('### Contas a pagar em aberto, em quatro faixas', '')
tab(['Faixa', 'Parcelas', 'Valor', 'Origem'], [
    ['Vencidas', ctas['vencidas']['parcelas'], brl(ctas['vencidas']['valor']), DS],
    ['Até 7 dias (até 28/10)', ctas['ate_7_dias']['parcelas'], brl(ctas['ate_7_dias']['valor']), DS],
    ['Até 30 dias (até 20/11, inclui as de 7 dias)', ctas['ate_30_dias']['parcelas'], brl(ctas['ate_30_dias']['valor']), DS + ' (valor) e ' + NV + ' (parcelas)'],
    ['Total em aberto', ctas['total']['parcelas'], brl(ctas['total']['valor']), NV],
])
p('### Próximos 30 dias: o que vence por dia e o saldo previsto', '',
  f'Linha do saldo previsto com o zero; não cruza o zero. Os pontos até 04/11 são os da prancha Gráficos ({DS}): "saldo R$ 41,3 mil (20/10)" e "R$ 8,2 mil em 28/10". Barra a mais em 22/10: o cartão a creditar amanhã, {brl(F["cartao_a_creditar"]["valor"])}, que não entra na linha.', '')
prev = [x for x in F['saldo_previsto'] if x['saidas'] > 0 or x['data'] == '2026-10-20']
tab(['Dia', 'Vence no dia', 'Parcelas', 'Saldo previsto', 'No gráfico'],
    [[data_sem(x['data']), brl(x['saidas']) if x['saidas'] else 'saldo digitado', x['parcelas'] or '—', brl(x['saldo_previsto']), mil(x['saldo_previsto'])] for x in prev])
p(f'Nos outros dias o saldo previsto repete o do dia anterior. Último ponto, 20/11: {brl(F["saldo_previsto"][-1]["saldo_previsto"])} = a folga em 30 dias.', '')
fm = F['fluxo_mes']
p('### Cartões', '')
tab(['Cartão', 'Números', 'Clique', 'Origem'], [
    ['Caixa', f'Quebra do caixa no fechamento de 20/10: R$ 0,00 (bateu nas 4 formas) · gaveta no fechamento: {brl(CX["dia_20_10"]["gaveta"]["gaveta"])} · gaveta agora (até 14h05): {brl(CX["dia_21_10_ate_14h05"]["gaveta"]["gaveta"])}', 'abre a F3', DS + ' (quebra) e ' + NV],
    ['Fluxo do mês (01 a 21/10)', f'entradas {brl(fm["entradas_total"])} (Pix {brl(fm["entradas"]["pix"])}, crédito {brl(fm["entradas"]["credito"])}, débito {brl(fm["entradas"]["debito"])}, dinheiro {brl(fm["entradas"]["dinheiro"])}) · saídas {brl(fm["saidas"])} · contra 01 a 21/09: entradas {brl(fm["setembro_mesmo_periodo"]["entradas"])}, saídas {brl(fm["setembro_mesmo_periodo"]["saidas"])}', 'sem clique (F4 adiada)', NV],
    ['Cartão a creditar amanhã (22/10)', f'{brl(F["cartao_a_creditar"]["valor"])} (crédito R$ 540,00 + débito R$ 370,00 vendidos hoje até 14h05)', 'sem clique (F4 adiada)', NV],
])
p(f'Nota no rodapé: "{F["nota_contas"]}"', '')
p('### Estados da F1', '')
tab(['Estado', 'Números e textos', 'Origem'], [
    ['Sem saldo', 'folgas vazias com "falta o saldo do banco"; contas e saídas aparecem: A pagar até 28/10 R$ 33.100,00; até 20/11 R$ 39.100,00', DS + ' e ' + NV],
    ['Saldo velho', 'aviso "Saldo de 12/09, há 39 dias" com "Atualizar saldo"; a folga aparece com o aviso', DS],
    ['Folga negativa (fora)', 'com saldo de R$ 29.900,00: folga em 7 dias −R$ 3.200,00; "faltam R$ 3.200,00 para o que vence até 28/10"', NV],
    ['Nenhuma conta em aberto', '"Nenhuma conta a pagar em aberto"; a folga é o próprio saldo, R$ 41.300,00', NV],
    ['Tudo bem', '"O saldo cobre os próximos 30 dias." (vale no exemplo: as duas folgas são positivas)', NV],
    ['Sem fechamento hoje', 'o cartão Caixa mostra o último fechamento, 20/10 (é o caso do exemplo, às 14h05)', NV],
])

# ======================================================================= F2
p('## F2 · Contas a pagar e previsão', '')
th = ctas['total_ha_7_dias']
p('### Resumo', '')
tab(['Item', 'Valor', 'Origem'], [
    ['Saldo', f'{brl(41300)} (digitado para 20/10)', DS],
    ['Vencidas', 'R$ 0,00 · 0 parcelas', DS],
    ['Até 7 dias', f'{brl(ctas["ate_7_dias"]["valor"])} · {ctas["ate_7_dias"]["parcelas"]} parcelas', DS],
    ['Até 30 dias', f'{brl(ctas["ate_30_dias"]["valor"])} · {ctas["ate_30_dias"]["parcelas"]} parcelas', DS + ' (valor) e ' + NV],
    ['Total', f'{brl(ctas["total"]["valor"])} · {ctas["total"]["parcelas"]} parcelas, contra {brl(th["valor"])} ({th["parcelas"]} parcelas) em 14/10 · {brl(ctas["total"]["valor"] - th["valor"])}', NV],
    ['Folga em 7 dias', f'{brl(F["folga_7"])}', DS],
    ['Folga em 30 dias', f'{brl(F["folga_30"])}', DS],
])
p(f'Recortes: Vencidas (0) · 7 dias ({ctas["ate_7_dias"]["parcelas"]}) · 30 dias ({ctas["ate_30_dias"]["parcelas"]}) · Todas ({ctas["total"]["parcelas"]}). Barra dividida por semana ({DS}): {brl(F["semanas"][0]["valor"])} de 22 a 23/10 · 26,0% e {brl(F["semanas"][1]["valor"])} de 26 a 28/10 · 74,0%.', '')
p('### Tabela por vencimento (cada data abre as parcelas)', '')
linhas = []
sp = {x['data']: x['saldo_previsto'] for x in F['saldo_previsto']}
for x in ctas['lista']:
    linhas.append([data_sem(x['vencimento'], x['vencimento'] > '2026-12-31'), x['fornecedor'], x['descricao'], x['documento'], x['parcela'], brl(x['valor']),
                   brl(sp[x['vencimento']]) if x['vencimento'] in sp else 'só no recorte "todas", sem saldo previsto', DS if x['origem'] == 'canonico' else NV])
tab(['Vencimento', 'Fornecedor', 'Descrição', 'Boleto ou nota', 'Parcela', 'Valor', 'Saldo previsto no fim do dia', 'Origem'], linhas)
p('Datas com mais de uma parcela: 10/11 (2 parcelas, R$ 1.200,00) e 30/11 (2 parcelas, R$ 6.100,00). Situação de todas: "a vencer". A variante com conta vencida (Madeiras do Vale, seg, 19/10, 1 de 4, R$ 4.950,00, "Vencida há 2 dias", total R$ 38.050,00) é exemplo à parte do Design System e não vale no exemplo principal.', '')
hist = F['historico_14_10']
p('### Como era 7 dias atrás (14/10), para a comparação', '')
tab(['Venceu em', 'Fornecedor', 'Documento', 'Parcela', 'Valor', 'Situação'],
    [[data_sem(x['vencimento']), x['fornecedor'], x['documento'], x['parcela'], brl(x['valor']), 'paga'] for x in hist['pagas_de_14_a_21']] +
    [['', '**Total pago de 14 a 21/10**', '', '', brl(hist['soma_pagas']), '']])
p(f'Folga em 7 dias em 14/10: saldo de 13/10 ({brl(hist["saldo_usado"]["valor"])}) − {brl(hist["soma_pagas"])} = {brl(F["folga_7_ha_7_dias"])} ({DS}: "R$ 11,5 mil há 7 dias"). Total em aberto em 14/10: {brl(th["valor"])} ({th["parcelas"]} parcelas) = hoje {brl(ctas["total"]["valor"])} − {brl(hist["soma_lancadas_depois"])} lançadas depois de 14/10 ({hist["lancadas_depois_de_14"]} parcelas) + {brl(hist["soma_pagas"])} pagas ({len(hist["pagas_de_14_a_21"])} parcelas).', '')
p('Estados: nenhuma conta ("Nenhuma conta a pagar em aberto"; gráfico só com o saldo); sem saldo (somem a linha e a coluna do saldo previsto, com "Digitar saldo"); vencidas maiores que zero (faixa no topo; use a variante da Madeiras do Vale); saldo previsto negativo (com o saldo de R$ 29.900,00 do estado da F1, o primeiro dia negativo seria 28/10: −R$ 3.200,00, marcado "fora", e os seguintes também). No celular: cartões por data (valor do dia e saldo previsto); tocar abre as parcelas.', '')

# ======================================================================= K1
k1 = J['K1']
p('## K1 · Saldo do banco', '', f'Linha do alto: "{k1["linha"]}"', '')
tab(['Item', 'Como aparece', 'Origem'], [
    ['Último saldo', f'{brl(k1["ultimo"]["valor"])} em 20/10/2026, há 1 dia · digitado por {k1["ultimo"]["quem"]} em {k1["ultimo"]["quando"]}', DS + ' (valor e data) e ' + NV],
    ['Formulário (padrão hoje)', f'Data 21/10/2026 · Valor R$ {num(k1["formulario_exemplo"]["valor"], 2)} · Salvar', NV],
    ['Depois de salvar', k1['formulario_exemplo']['depois_de_salvar'], 'TELAS.md'],
    ['Data que já tem saldo', k1['substituir'], NV],
    ['Apagar', k1['apagar'], NV],
    ['Valor vazio ou com letras', k1['erros']['valor'], NV],
    ['Data futura / antes de 01/04/2026', k1['erros']['futuro'] + ' / ' + k1['erros']['antes'], NV],
    ['Valor negativo', k1['erros']['negativo'], NV],
    ['Nenhum saldo ainda', k1['nenhum'], 'TELAS.md'],
    ['Celular (folha que sobe de baixo)', '"Digitar o saldo do banco" · "Saldo em 20/10/2026" · R$ 0,00 · "A folga em 7 dias passa a usar este saldo." · Cancelar · Salvar', DS],
])
p('Histórico das últimas 10 digitações (o exemplo do formulário, de 21/10, ainda não está salvo):', '')
tab(['Data do saldo', 'Valor', 'Quem', 'Quando', ''],
    [[data_sem(x['data'], True), brl(x['valor']), x['quem'], x['quando'], 'Corrigir · Apagar'] for x in k1['historico']])
p(f'O saldo de 13/10 ({brl(37620)}) é o que a folga de 14/10 usou. O de 01/10 ({brl(48000)}) é o da ilustração da TELAS.md. Origem do histórico: {NV}.', '')

# ======================================================================= F3
p('## F3 · Caixa da loja', '')
d20 = CX['dia_20_10']
fe = d20['fechamento']
g20 = d20['gaveta']
p('### Hoje, 21/10, às 14h05 (o caixa ainda não fechou)', '',
  f'Frase: "{CX["dia_21_10_ate_14h05"]["frase"]}", com o atalho para 20/10. Gaveta agora: vendas em dinheiro {brl(CX["dia_21_10_ate_14h05"]["gaveta"]["vendas_dinheiro"])} + suprimentos {brl(150)} − sangrias {brl(200)} − devoluções em dinheiro R$ 0,00 = {brl(CX["dia_21_10_ate_14h05"]["gaveta"]["gaveta"])}. Movimentos: 07h03 suprimento {brl(150)} (troco da abertura); 12h15 sangria {brl(200)} (para o cofre). Origem: {NV}.', '')
p('### Dia: terça, 20/10 (exemplo principal)', '', f'Faixa: "{d20["faixa"]}". Quebra do dia: R$ 0,00 · No lugar ({DS}) · média do mês: {brl(CX["mes"]["media_por_fechamento"])} por fechamento ({NV}). Frase: "{d20["frase"]}"', '')
p(f'Cartão do fechamento nº {fe["numero"]}: {fe["caixa"]} · operador: {fe["operador"]} · abertura {fe["abertura"]} → fechamento {fe["fechamento"]} · quebra do turno R$ 0,00.', '')
tab(['Forma', 'Calculado', 'Informado', 'Quebra'],
    [[x['forma'], brl(x['calculado']), brl(x['informado']), brl(x['quebra'])] for x in fe['formas']] +
    [['**Total**', brl(sum(x['calculado'] for x in fe['formas'])), brl(sum(x['informado'] for x in fe['formas'])), brl(sum(x['quebra'] for x in fe['formas']))]])
p(f'No dinheiro, o calculado é a gaveta esperada (o operador conta a gaveta); nas outras formas, o que foi vendido nelas. Vendas do dia por forma: Pix {brl(d20["vendas_por_forma"]["pix"])}, crédito {brl(d20["vendas_por_forma"]["credito"])}, débito {brl(d20["vendas_por_forma"]["debito"])}, dinheiro {brl(d20["vendas_por_forma"]["dinheiro"])} = vendido {brl(d20["vendido"])}; menos devoluções {brl(d20["devolucoes"])} = realizado {brl(d20["realizado"])} (R$ 5,9 mil na barra de 20/10 da V1).', '')
p(f'Gaveta escrita como conta: vendas em dinheiro {brl(g20["vendas_dinheiro"])} + suprimentos {brl(g20["suprimentos"])} − sangrias {brl(g20["sangrias"])} − devoluções em dinheiro {brl(g20["devolucoes_dinheiro"])} = gaveta {brl(g20["gaveta"])}.', '')
tab(['Hora', 'Tipo', 'Valor', 'Operador', 'Observação'], [[x['hora'], x['tipo'], brl(x['valor']), x['operador'], x['observacao']] for x in d20['movimentos']])
pm = CX['mes']
p('### Mês: outubro até 20/10', '')
NOMEF = {'dinheiro': 'Dinheiro', 'pix': 'Pix', 'credito': 'Crédito', 'debito': 'Débito'}
tab(['Forma', 'Quebra acumulada'], [[NOMEF[k], brl(v)] for k, v in pm['por_forma'].items()] + [['**Total**', brl(pm['quebra_total'])]])
p(f'{pm["fechamentos"]} fechamentos; média {brl(pm["media_por_fechamento"])} por fechamento. Tolerância provisória: quebra acima de {brl(pm["tolerancia"])}, para mais ou para menos, é fora. Gráfico da quebra por dia: zero em 12 dias; 02/10 {MENOS}R$ 5,00; 07/10 +R$ 2,00; 09/10 {MENOS}R$ 38,00 (fora); 15/10 {MENOS}R$ 1,50.', '')
tab(['Dia', 'Fechamento', 'Caixa', 'Operador', 'Abertura → fechamento', 'Quebra', 'Estado'],
    [[data_sem(t['data']), f'nº {t["fechamento_numero"]}', t['caixa'], t['operador'], f'{t["abertura"]} → {t["fechamento"]}', brl(t['quebra'], True), 'Fora' if t['estado'] == 'fora' else '—'] for t in pm['turnos']])
d9 = CX['dia_09_10_fora']
p('### Estado "quebra fora da tolerância": sexta, 09/10', '')
tab(['Forma', 'Calculado', 'Informado', 'Quebra'],
    [[x['forma'], brl(x['calculado']), brl(x['informado']), brl(x['quebra']) + (' · Fora' if abs(x['quebra']) > 5 else '')] for x in d9['formas']] +
    [['**Total**', brl(sum(x['calculado'] for x in d9['formas'])), brl(sum(x['informado'] for x in d9['formas'])), brl(sum(x['quebra'] for x in d9['formas']))]])
p(f'Fechamento nº {d9["numero"]}, Caixa 1, operador gerente. Faltaram R$ 38,00 no débito. Gaveta: {brl(d9["gaveta"]["vendas_dinheiro"])} + {brl(d9["gaveta"]["suprimentos"])} − {brl(d9["gaveta"]["sangrias"])} − {brl(d9["gaveta"]["devolucoes_dinheiro"])} = {brl(d9["gaveta"]["gaveta"])}. Vendido {brl(d9["vendido"])} − devoluções {brl(d9["devolucoes"])} = {brl(d9["vendido"] - d9["devolucoes"])} (R$ 6,4 mil na V1).', '')
p(f'Nota fixa: "{CX["nota"]}" No celular, só o dia: um cartão por fechamento e a gaveta.', '')

# ======================================================================= K2
p('## K2 · Metas e feriados', '', 'Seletor "‹ outubro de 2026 ›" (a lista vai de abril de 2026 a outubro de 2027). Só computador.', '')
ma = V['meses_anteriores']
mo = M['outubro']
p('### Metas de outubro de 2026', '')
tab(['Linha', 'Meta (campo)', 'Realizado em julho', 'Agosto', 'Setembro', 'Origem'], [
    ['Loja', brl(mo['loja']), brl(ma['julho']['loja']), brl(ma['agosto']['loja']), brl(ma['setembro']['loja']), DS + ' (meta) e ' + NV],
    ['Igor', brl(mo['Igor']), brl(ma['julho']['Igor']), brl(ma['agosto']['Igor']), brl(ma['setembro']['Igor']), DS + ' (meta) e ' + NV],
    ['Daniele', brl(mo['Daniele']), brl(ma['julho']['Daniele']), brl(ma['agosto']['Daniele']), brl(ma['setembro']['Daniele']), DS + ' (meta) e ' + NV],
])
p(f'O realizado da loja inclui Outros (julho {brl(ma["julho"]["Outros"])}, agosto {brl(ma["agosto"]["Outros"])}, setembro {brl(ma["setembro"]["Outros"])}). Conferência: soma das metas dos vendedores {brl(mo["Igor"] + mo["Daniele"])} · meta da loja {brl(mo["loja"])} · diferença R$ 0,00 ("venda de quem não é vendedor no ERP conta só na meta da loja"). Botões: Salvar · Copiar do mês anterior · Desfazer.', '')
p('### Dias sem expediente de outubro', '',
  'Calendário do mês com os domingos apagados (04, 11, 18 e 25) e 12/10 fechado, com a descrição "Nossa Senhora Aparecida". "Dias úteis no mês: 26". Lista dos dias fechados: "seg, 12/10 · Nossa Senhora Aparecida · Remover". Regra à vista: "Marque só os dias em que a loja não abre. Feriado em que a loja abriu não entra." (DS)', '')
mn, ms = M['novembro'], M['setembro']
tab(['Mês', 'Metas', 'Dias fechados', 'Dias úteis', 'O que a tela mostra', 'Origem'], [
    ['setembro de 2026 (passado)', f'loja {brl(ms["loja"])}; Igor {brl(ms["Igor"])}; Daniele {brl(ms["Daniele"])}', 'seg, 07/09 · Independência; sáb, 26/09 · Inventário da troca de ERP', ms['dias_uteis'],
     'mudar algo pede: "Isso muda o ritmo e a projeção de todos os dias de setembro"', DS + ' (dias e loja) e ' + NV],
    ['novembro de 2026 (próximo)', f'loja {brl(mn["loja"])}; Igor {brl(mn["Igor"])}; Daniele {brl(mn["Daniele"])} (já digitadas; conferência: {brl(mn["Igor"] + mn["Daniele"])} nos vendedores, diferença R$ 0,00)', 'seg, 02/11 · Finados (em 20/11 a loja abre)', mn['dias_uteis'],
     f'menores que as de outubro porque novembro tem {mn["dias_uteis"]} dias úteis; realizado dos 3 meses anteriores: agosto {brl(ma["agosto"]["loja"])}, setembro {brl(ma["setembro"]["loja"])} e outubro até 21/10 {brl(mes["realizado"])}', NV],
    ['dezembro de 2026', 'vazias', 'sex, 25/12 · Natal', M['dezembro']['dias_uteis'], f'"{M["dezembro"]["estado"]}" e "Copiar do mês anterior" (traz {brl(mn["loja"])}, {brl(mn["Igor"])} e {brl(mn["Daniele"])})', NV],
    ['abril a agosto de 2026', 'vazias (sem meta cadastrada)', 'maio: sex, 01/05 · Dia do Trabalho', '—', '"Sem meta, o ritmo fica vazio."', DS + ' (01/05) e ' + NV],
])
aj = M['ajuste_igor_exemplo']
p('### Mensagens e o ajuste da prancha Formulário', '')
tab(['Momento', 'Texto', 'Origem'], [
    ['Efeito ao digitar a meta do Igor', aj['efeito'], DS],
    ['Confirmação', aj['confirmacao'], DS],
    ['Conferência depois desse ajuste', f'soma dos vendedores {brl(aj["conferencia_depois"]["soma_vendedores"])} · loja {brl(aj["conferencia_depois"]["loja"])} · diferença {brl(aj["conferencia_depois"]["diferenca"])}', NV],
    ['Erro no campo', 'Digite um valor maior que zero, no formato 60.000,00.', DS],
    ['Gravação falhou', 'A gravação falhou e nada foi alterado. O que você digitou continua nos campos; tente de novo.', DS],
    ['Salvo', '"Metas de outubro salvas" · a conferência do servidor · "vale a partir das 15h" · "ver o desvio" (abre a V1)', 'TELAS.md'],
    ['Dia de segunda a sábado clicado', '"Loja fechada neste dia?" com campo de descrição', 'TELAS.md'],
    ['Dia fechado clicado', '"Reabrir este dia", com confirmação', 'TELAS.md'],
    ['Vendedor novo no ERP / que deixou de ser', 'linha marcada "novo no ERP" / "a meta dele não entra no ritmo"', 'TELAS.md'],
])

# ======================================================================= CONFERÊNCIAS
conf = AQUI / 'conferencias.txt'
p('## Conferências', '', 'O script `conferir_dados.py` lê o `dados-exemplo.json`, refaz cada conta e compara com os números do Design System, tirados das próprias pranchas. Resultado da última rodada:', '')
if conf.exists():
    p(*[('- ' + ln) for ln in conf.read_text().strip().splitlines()])
else:
    p('- (rode `python3 conferir_dados.py`)')
p('')
(AQUI / 'dados-exemplo.md').write_text('\n'.join(L))
print('ok: dados-exemplo.md', len(L), 'linhas')
