# Confere o livro de dados de exemplo (dados-exemplo.json e dados-exemplo.md).
# Refaz cada conta a partir dos números de base e compara com os números do Design System,
# tirados das próprias pranchas (versão 1790997087-c8ea). Escreve conferencias.txt.
# Uso: python3 conferir_dados.py   (sai com erro se alguma conta não fechar)
import json, os, re, sys, html, pathlib, datetime as dt
from decimal import Decimal, ROUND_HALF_UP

AQUI = pathlib.Path(__file__).parent
# Pasta 'project' do Design System baixado do Artifact (versão 1790997087-c8ea); sem ela, as conferências contra as pranchas são puladas.
DS = pathlib.Path(os.environ.get('KAIZEN_DS', '/tmp/kaizen-ds/project'))
sys.path.insert(0, str(AQUI))
from fmt import brl, mil, pct, ritmo as fr, num  # noqa: E402

J = json.loads((AQUI / 'dados-exemplo.json').read_text())
MD = (AQUI / 'dados-exemplo.md').read_text()
D = dt.date
HOJE = D(2026, 10, 21)
RES = []


def c(v):
    return int(Decimal(str(v)).scaleb(2).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def hq(x, casas):
    return float(Decimal(str(x)).quantize(Decimal(1).scaleb(-casas), rounding=ROUND_HALF_UP))


def ok(desc, cond, detalhe=''):
    RES.append((desc, bool(cond), detalhe))


def d(s):
    return D.fromisoformat(s)


def dias(a, b):
    x = a
    while x <= b:
        yield x
        x += dt.timedelta(1)


FECH = {d(x['data']) for x in J['base']['dias_sem_expediente']}


def util(x):
    return x.weekday() < 6 and x not in FECH


V, CP, F, CX, M = J['vendas'], J['compras'], J['financeiro'], J['caixa'], J['metas']
mes, dia = V['mes'], V['dia']
vend = {x['nome']: x for x in V['vendedores']}
igor, dani, outros = vend['Igor'], vend['Daniele'], V['outros']

# ============================================================ 1. CANÔNICOS, TIRADOS DAS PRANCHAS
def texto(nome):
    s = (DS / 'components' / nome / 'preview.html').read_text()
    s = re.sub(r'<script.*?</script>', ' ', s, flags=re.S)
    s = re.sub(r'<style.*?</style>', ' ', s, flags=re.S)
    s = re.sub(r'</?(b|strong|em|i|small|span|abbr)\b[^>]*>', '', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s).replace('\xa0', ' '))


if DS.exists():
    g = (DS / 'components/Graficos/preview.html').read_text()
    DIAS = json.loads(re.search(r'DIAS=(\[\[.*?\]\])', g).group(1))
    SALDO = json.loads(re.search(r'SALDO=(\[\[.*?\]\])', g).group(1))
    UTEIS = json.loads(re.search(r'UTEIS=(\[.*?\])', g).group(1))
    HORAS = json.loads(re.search(r"var dados=(\[\[.*?\]\]);", g).group(1).replace("'", '"'))
    readme = re.sub(r'\s+', ' ', (DS / 'README.md').read_text())
    T = {n: texto(n) for n in ['CartaoPergunta', 'NumeroGrande', 'IndicadorMeta', 'Tabela', 'BarraDividida', 'AbasFiltros',
                               'MolduraCelular', 'ListaDetalhe', 'Formulario', 'DicaDefinicao', 'BlocoIA', 'PaginaAmostra']}

    ok('vendas de cada dia (01 a 21/10) iguais às da prancha Gráficos', [[int(dd[-2:]), x] for dd, x in [(y['data'], y['mil_canonico']) for y in V['por_dia']]] == DIAS)
    ok('valor exato de cada dia arredonda para o da prancha Gráficos (21 dias)', all(hq(y['realizado'] / 1000, 1) == y['mil_canonico'] for y in V['por_dia']))
    ok('dias úteis de outubro iguais aos da prancha Gráficos (26 dias)', J['base']['outubro']['uteis'] == UTEIS and len(UTEIS) == 26)
    ok('vendas de hoje por hora iguais às da prancha Gráficos (8h a 14h)', [[h['hora'], h['mil_canonico']] for h in V['por_hora']] == HORAS
       and all(hq(h['realizado'] / 1000, 1) == h['mil_canonico'] for h in V['por_hora']))
    prev = {x['data']: x['saldo_previsto'] for x in F['saldo_previsto']}
    ok('saldo previsto de 20/10 a 04/11 igual ao da prancha Gráficos (16 pontos, arredondado)',
       all(hq(prev['2026-' + dm[3:] + '-' + dm[:2]] / 1000, 1) == v for dm, v in SALDO) and len(SALDO) == 16)
    t = T['Tabela']
    canon5 = [x for x in F['contas_a_pagar']['lista'] if x['origem'] == 'canonico']
    ok('as 5 contas (fornecedor, dia, parcela, valor) iguais às da prancha Tabela',
       all(re.search(re.escape(x['fornecedor']) + r' \w+, ' + x['vencimento'][8:] + '/' + x['vencimento'][5:7] + ' ' + re.escape(x['parcela']) + ' ' + re.escape(brl(x['valor'])), t) for x in canon5) and len(canon5) == 5)
    ok('total da prancha Tabela "Total · 5 contas R$ 33.100,00" igual ao livro', 'Total · 5 contas R$ 33.100,00' in t and brl(F['contas_a_pagar']['ate_7_dias']['valor']) == 'R$ 33.100,00')
    bd = T['BarraDividida']
    cp = CP['comprados']
    ok('curvas da prancha Barra dividida: 66 A · 44,0%, 40 B · 26,7%, 31 C · 20,7%, 13 sem venda · 8,7%',
       all(f'{cp[k]} {n} · {pct(cp["percentuais"][k])}' in bd for k, n in [('A', 'curva A'), ('B', 'curva B'), ('C', 'curva C'), ('sem_venda', 'sem venda')]))
    ok('contas por semana da prancha Barra dividida: R$ 8.620,00 (26,0%) e R$ 24.480,00 (74,0%)',
       f'{brl(F["semanas"][0]["valor"])} de 22 a 23/10 · 26,0%' in bd and f'{brl(F["semanas"][1]["valor"])} de 26 a 28/10 · 74,0%' in bd)
    cpg = T['CartaoPergunta']
    chaves = [f'{mil(mes["realizado"])} de R$ 150 mil · {pct(mes["percentual_meta"])} da meta', f'Ritmo {fr(mes["ritmo"])} · 17 de 26 dias úteis',
              f'Hoje até 14h05: {mil(dia["realizado"])} em {dia["vendas"]} vendas', f'A projeção fecha em {mil(mes["projecao"])} para a meta de R$ 150 mil',
              f'{mil(igor["realizado_mes"])} · {pct(igor["percentual_meta"])}', f'ritmo {fr(igor["ritmo"])}', f'{mil(dani["realizado_mes"])} · {pct(dani["percentual_meta"])}',
              f'ritmo {fr(dani["ritmo"])} | Fora', f'Outros (sem meta própria) | {mil(outros["realizado_mes"])}', 'Dobradiça 35 mm', 'Corrediça 450 mm', 'Puxador 128 mm',
              cp['frase'], f'Parado há 90 dias: {CP["encalhe"]["produtos"]} produtos · {mil(CP["encalhe"]["valor"])}', f'{mil(F["folga_7"])} | de folga em 7 dias',
              f'Folga em 30 dias (até 20/11) | {mil(F["folga_30"])}', f'Saldo do banco em 20/10 | {brl(F["saldo_banco"]["valor"])}',
              f'A vencer até 28/10: {F["contas_a_pagar"]["ate_7_dias"]["parcelas"]} contas | {brl(F["contas_a_pagar"]["ate_7_dias"]["valor"])}',
              'Quebra do caixa no fechamento de 20/10 | ' + brl(CX['dia_20_10']['fechamento']['formas'][0]['quebra']), 'Saldo de 12/09', 'há 39 dias']
    nz = lambda x: re.sub(r'[\s|]', '', x)  # compara sem espaços: a prancha junta dois trechos sem espaço entre eles
    falt = [k for k in chaves if nz(k) not in nz(cpg)]
    ok(f'{len(chaves)} números do Cartão de pergunta (Vendas, Compras, Financeiro e estados) iguais aos do livro', not falt, '; '.join(falt))
    ng = T['NumeroGrande']
    chaves = [f'{mil(-mes["falta"])}', f'Atenção {fr(mes["ritmo"] - 1, True)}', f'contra {mil(F["folga_7_ha_7_dias"])} há 7 dias', mil(F['folga_7'] - F['folga_7_ha_7_dias']),
              f'contra {CP["encalhe"]["ha_30_dias"]["produtos"]} há 30 dias', f'+{CP["encalhe"]["produtos"] - CP["encalhe"]["ha_30_dias"]["produtos"]} produtos',
              f'contra {mil(dia["dia_como_hoje"])} num dia como hoje até 14h05', mil(dia['diferenca_dia_como_hoje'], True),
              f'saldo {brl(F["saldo_banco"]["valor"])} − {brl(F["contas_a_pagar"]["ate_7_dias"]["valor"])} que vencem até 28/10']
    falt = [k for k in chaves if k not in ng]
    ok(f'{len(chaves)} números da prancha Número grande (−R$ 57,6 mil, −0,06, R$ 11,5 mil, −R$ 3,3 mil, +8 produtos, +R$ 0,3 mil...) batem com o livro', not falt, '; '.join(falt))
    im = T['IndicadorMeta']
    ok('linhas da prancha Indicador (Loja 0,94 · 61,6%; Igor 1,04 · 68,0%; Daniele 0,82 · 53,6%) iguais às do livro',
       all(s in im for s in [f'{fr(mes["ritmo"])} · {mil(mes["realizado"])} · {pct(mes["percentual_meta"])}', f'{fr(igor["ritmo"])} · {mil(igor["realizado_mes"])} · {pct(igor["percentual_meta"])}',
                             f'{fr(dani["ritmo"])} · {mil(dani["realizado_mes"])} · {pct(dani["percentual_meta"])}', f'projeção {mil(mes["projecao"])} · meta R$ 150 mil']))
    af = T['AbasFiltros']
    ok('visões da prancha Abas e filtros (Encalhe 38, Ruptura 3, Comprados sem venda 13) e o período "90 dias até 21/10 (24/07 a 21/10)"',
       all(f'{k} {CP["visoes"][k]}' in af for k in ['Encalhe', 'Ruptura', 'Comprados sem venda']) and CP['periodo']['texto'] in af)
    e15 = V['exemplo_15_09']
    mc = T['MolduraCelular']
    ok('cartão de 15/09 da Moldura do celular (R$ 76,8 mil, 51,2%, ritmo 1,02, 12 de 24, projeção R$ 153,6 mil, faixa) igual ao livro',
       all(s in mc for s in [mil(e15['realizado']), f'{pct(e15["percentual_meta"])} da meta', f'Ritmo {fr(e15["ritmo"])} · 12 de 24 dias úteis', mil(e15['projecao']), e15['faixa']]))
    ok('parágrafo "Dados de exemplo" do README: meta, realizado, ritmo, projeção, vendedores, compras, saldo, folga, quebra e dias sem expediente iguais ao livro',
       all(s in readme for s in ['meta R$ 150 mil; realizado R$ 92,4 mil (61,6% da meta); 17 de 26 dias úteis; ritmo 0,94 (atenção); projeção R$ 143,8 mil; hoje até 14h05 R$ 4,1 mil em 24 vendas',
                                 'Igor R$ 51,0 mil, 68,0% da meta, ritmo 1,04; Daniele R$ 40,2 mil, 53,6%, ritmo 0,82 (fora); Outros (sem meta própria) R$ 1,2 mil',
                                 'dos 150 comprados em 90 dias, 66 curva A, 40 B, 31 C e 13 sem venda; parado há 90 dias: 38 produtos, R$ 24,6 mil',
                                 'saldo do banco R$ 41.300,00 (digitado para 20/10); a pagar até 28/10 R$ 33.100,00, nenhuma vencida; folga em 7 dias R$ 8.200,00 (no lugar); quebra do caixa R$ 0,00 no fechamento de 20/10',
                                 '01/05, 07/09 e 26/09 de 2026', '12/10']))
    ok('lista "fictícios de propósito" do README: R$ 3,8 mil, R$ 11,5 mil há 7 dias, 30 parados há 30 dias, média R$ 5,5 mil dos 16 dias, folga em 30 dias R$ 2,2 mil',
       all(s in readme for s in ['R$ 3,8 mil "num dia como hoje até 14h05"', 'a folga de R$ 11,5 mil há 7 dias', '30 produtos parados há 30 dias',
                                 'somam R$ 92,4 mil; média dos 16 dias completos R$ 5,5 mil', 'somam R$ 4,1 mil', 'somam R$ 33.100,00', 'a folga em 30 dias (até 20/11) de R$ 2,2 mil',
                                 'meta de setembro de R$ 150 mil, R$ 76,8 mil, 51,2%, ritmo 1,02, 12 de 24 dias úteis, projeção R$ 153,6 mil']))
    fo = T['Formulario']
    aj = M['ajuste_igor_exemplo']
    ok('textos do ajuste da meta do Igor (prancha Formulário) iguais aos do livro', aj['efeito'] in fo and aj['confirmacao'] in fo and 'outubro de 2027' in fo and 'abril de 2026' in fo)
    ok('texto da IA e dica do ritmo (pranchas Bloco IA e Dica) citados no livro iguais aos das pranchas',
       'A loja está um pouco atrás da meta, com ritmo de 0,94. O atraso está na Daniele, com ritmo de 0,82; o Igor está adiantado, com 1,04.' in T['BlocoIA']
       and 'Ritmo é o realizado dividido pela meta, na proporção dos dias úteis que já passaram. Acima de 1,00 está adiantado. Hoje: 17 de 26 dias úteis.' in T['DicaDefinicao'])
    ok('cliente de exemplo do Design System: Marcenaria Bom Jesus sumida há 74 dias, última compra sáb, 08/08/2026 (fecha com 21/10)',
       'Sumido há 74 dias' in T['ListaDetalhe'] and 'sáb, 08/08/2026' in T['ListaDetalhe'] and (HOJE - D(2026, 8, 8)).days == 74 and D(2026, 8, 8).weekday() == 5)
else:
    ok('pasta do Design System encontrada para conferir os canônicos', False, str(DS))

# ============================================================ 2. CALENDÁRIO
out = [x for x in dias(D(2026, 10, 1), D(2026, 10, 31)) if util(x)]
ok('21/10/2026 é quarta-feira; 15/09/2026 é terça; 18/10/2026 é domingo; 12/10/2026 é segunda',
   HOJE.weekday() == 2 and D(2026, 9, 15).weekday() == 1 and D(2026, 10, 18).weekday() == 6 and D(2026, 10, 12).weekday() == 0)
ok('outubro: 26 dias úteis (segunda a sábado, menos 12/10); 17 até 21/10, contando hoje; faltam 9',
   len(out) == 26 and len([x for x in out if x <= HOJE]) == 17 == mes['decorridos'] and len([x for x in out if x > HOJE]) == 9 == mes['faltam_dias'])
st = [x for x in dias(D(2026, 9, 1), D(2026, 9, 30)) if util(x)]
ok('setembro: 24 dias úteis (menos 07/09 e 26/09); 12 até 15/09', len(st) == 24 and len([x for x in st if x <= D(2026, 9, 15)]) == 12)
nv = [x for x in dias(D(2026, 11, 1), D(2026, 11, 30)) if util(x)]
ok('novembro: 24 dias úteis com 02/11 fechado (5 domingos)', len(nv) == 24 == M['novembro']['dias_uteis'])
ok('período de compras: de 24/07 a 21/10 são 90 dias', (HOJE - D(2026, 7, 24)).days + 1 == 90)
ok('saldo velho: de 12/09 a 21/10 são 39 dias', (HOJE - D(2026, 9, 12)).days == 39)
datas_neg = [x['data'] for x in V['por_dia'] if x['realizado'] > 0 and not util(d(x['data']))]
ok('nenhuma venda em domingo nem em 12/10; venda em todos os outros dias de 01 a 21/10',
   not datas_neg and all((x['realizado'] > 0) == util(d(x['data'])) for x in V['por_dia']))
evs = [x['vencimento'] for x in F['contas_a_pagar']['lista']] + [x['vencimento'] for x in F['historico_14_10']['pagas_de_14_a_21']]
ok(f'nenhuma das {len(evs)} contas vence em domingo', all(d(x).weekday() != 6 for x in evs))
compras_datas = [x['comprado_90']['data'] for x in CP['encalhe']['lista'] if 'comprado_90' in x] + [x['primeira_entrada'] for x in CP['comprados_sem_venda']['novos']]
ok('compras dos 90 dias em dia de loja aberta e nunca em 26 ou 27/09 (inventário e domingo da troca de ERP)',
   all(util(d(x)) and x not in ('2026-09-26', '2026-09-27') for x in compras_datas))
ok('saldos do banco digitados para dias de loja aberta, e digitados no dia seguinte', all(util(d(x['data'])) for x in J['K1']['historico'])
   and all(int(x['quando'][:2]) == (d(x['data']) + dt.timedelta(1)).day for x in J['K1']['historico']))
ok('fechamentos de caixa só em dias de loja aberta, um por dia, de 01 a 20/10', [t['data'] for t in CX['mes']['turnos']] == [x.isoformat() for x in out if x < HOJE])

# ============================================================ 3. VENDAS
real = sum(c(x['realizado']) for x in V['por_dia'])
ok('vendas por dia de 01 a 21/10 somam R$ 92,4 mil (R$ 92.400,00 exatos)', real == c(mes['realizado']) == 9240000 and mil(mes['realizado']) == 'R$ 92,4 mil')
comp = [x for x in V['por_dia'] if x['realizado'] > 0 and x['data'] != '2026-10-21']
ok('média dos 16 dias completos com venda = R$ 5.518,75 → R$ 5,5 mil', len(comp) == 16 and sum(c(x['realizado']) for x in comp) / 16 == c(V['media_dias_completos']) and mil(V['media_dias_completos']) == 'R$ 5,5 mil')
acc = 0
okacc = True
for x in V['por_dia']:
    acc += c(x['realizado'])
    okacc &= acc == c(x['acumulado'])
ok('acumulado dia a dia confere com a soma das vendas de cada dia', okacc)
macc, okm = 0, True
for x in V['por_dia']:
    if util(d(x['data'])):
        macc += 15000000 / 26
    okm &= abs(round(macc) - c(x['meta_acumulada'])) <= 1
ok('meta em degraus: sobe R$ 5.769,23 por dia útil; até 21/10 = R$ 98.076,92 → R$ 98,1 mil', okm and c(mes['meta_ate_hoje']) == round(15000000 * 17 / 26) and mil(mes['meta_ate_hoje']) == 'R$ 98,1 mil')
ok('vendas de hoje por hora somam R$ 4.100,00 em 24 vendas', sum(c(h['realizado']) for h in V['por_hora']) == c(dia['realizado']) == 410000 and sum(h['vendas'] for h in V['por_hora']) == dia['vendas'] == 24)
ok('percentual da loja: 92.400 ÷ 150.000 = 61,6%', hq(mes['realizado'] / mes['meta'] * 100, 1) == mes['percentual_meta'] == 61.6)
rl = mes['realizado'] / (mes['meta'] * 17 / 26)
ok(f'ritmo da loja: 92.400 ÷ (150.000 × 17 ÷ 26) = {num(rl, 4)} → 0,94, atenção (0,90 a 0,99)', hq(rl, 2) == mes['ritmo'] == 0.94 and 0.90 <= mes['ritmo'] < 1)
for x in (igor, dani):
    r_ = x['realizado_mes'] / (x['meta'] * 17 / 26)
    est = 'no lugar' if hq(r_, 2) >= 1 else ('atenção' if hq(r_, 2) >= 0.9 else 'fora')
    ok(f'{x["nome"]}: {brl(x["realizado_mes"])} ÷ R$ 75.000,00 = {pct(x["percentual_meta"])}; ritmo {num(r_, 4)} → {fr(x["ritmo"])} ({est}); falta {brl(x["falta"])}',
       hq(x['realizado_mes'] / x['meta'] * 100, 1) == x['percentual_meta'] and hq(r_, 2) == x['ritmo'] and est == x['estado'] and c(x['meta']) - c(x['realizado_mes']) == c(x['falta']))
ok('canônicos dos vendedores: Igor R$ 51,0 mil · 68,0% · 1,04; Daniele R$ 40,2 mil · 53,6% · 0,82 (fora); Outros R$ 1,2 mil',
   (mil(igor['realizado_mes']), pct(igor['percentual_meta']), fr(igor['ritmo'])) == ('R$ 51,0 mil', '68,0%', '1,04')
   and (mil(dani['realizado_mes']), pct(dani['percentual_meta']), fr(dani['ritmo']), dani['estado']) == ('R$ 40,2 mil', '53,6%', '0,82', 'fora')
   and mil(outros['realizado_mes']) == 'R$ 1,2 mil')
ok('vendedores + Outros = loja no mês (R$ 51.012,40 + R$ 40.193,80 + R$ 1.193,80 = R$ 92.400,00)', c(igor['realizado_mes']) + c(dani['realizado_mes']) + c(outros['realizado_mes']) == c(mes['realizado']))
ok('vendedores + Outros = loja hoje (R$ 2.296,40 + R$ 1.658,70 + R$ 144,90 = R$ 4.100,00)', c(igor['realizado_dia']) + c(dani['realizado_dia']) + c(outros['realizado_dia']) == c(dia['realizado']))
ok('vendas no mês: 341 + 279 + 22 = 642; hoje: 13 + 10 + 1 = 24', igor['vendas_mes'] + dani['vendas_mes'] + outros['vendas_mes'] == mes['vendas'] == 642 and igor['vendas_dia'] + dani['vendas_dia'] + outros['vendas_dia'] == 24)
ok('falta da loja R$ 57.600,00 (−R$ 57,6 mil) e R$ 6.400,00 por dia útil restante (÷ 9)', c(mes['meta']) - c(mes['realizado']) == c(mes['falta']) == 5760000 and c(mes['falta']) / 9 == c(mes['por_dia_util_restante']))
ok('vendido − devoluções = realizado: mês R$ 93.540,00 − R$ 1.140,00 = R$ 92.400,00; hoje R$ 4.100,00 − R$ 0,00',
   c(mes['vendido']) - c(mes['devolucoes']) == c(mes['realizado']) and c(dia['vendido']) - c(dia['devolucoes']) == c(dia['realizado']))
md8 = mes['medias_8_semanas']
NOMES = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
rest = [x for x in out if x >= HOJE]
proj = c(mes['realizado_ate_ontem']) + sum(c(md8[NOMES[x.weekday()]]) for x in rest)
ok('projeção pela regra do Kaizen: R$ 88.300,00 até ontem + médias de 8 semanas dos 10 dias úteis de 21 a 31/10 = R$ 143.796,30 → R$ 143,8 mil',
   len(rest) == 10 and c(mes['realizado_ate_ontem']) == real - c(V['por_dia'][-1]['realizado']) and proj == c(mes['projecao']) and mil(mes['projecao']) == 'R$ 143,8 mil')
ok('projeção − meta = −R$ 6.203,70 → −R$ 6,2 mil', c(mes['projecao']) - c(mes['meta']) == c(mes['projecao_menos_meta']) and mil(mes['projecao_menos_meta']) == '−R$ 6,2 mil')
ok('médias de 8 semanas plausíveis contra outubro (cada uma a menos de R$ 400,00 da média dos mesmos dias de outubro)',
   all(abs(c(md8[k]) - sum(c(x['realizado']) for x in comp if NOMES[d(x['data']).weekday()] == k) / max(1, len([x for x in comp if NOMES[d(x['data']).weekday()] == k]))) < 40000 for k in md8))
ok('hoje contra um dia como hoje: R$ 4,1 mil − R$ 3,8 mil = +R$ 0,3 mil', c(dia['realizado']) - c(dia['dia_como_hoje']) == c(dia['diferenca_dia_como_hoje']) and mil(dia['diferenca_dia_como_hoje'], True) == '+R$ 0,3 mil')
fh = dia['formas']
ok(f'formas de hoje somam R$ 4.100,00 (Pix {pct(fh["pix"] / dia["vendido"] * 100)}, cartão {pct((fh["credito"] + fh["debito"]) / dia["vendido"] * 100)}, dinheiro {pct(fh["dinheiro"] / dia["vendido"] * 100)})', sum(c(v) for v in fh.values()) == c(dia['vendido'])
   and 0.65 < fh['pix'] / dia['vendido'] < 0.75 and 0.18 < (fh['credito'] + fh['debito']) / dia['vendido'] < 0.26)
ok('cartão a creditar amanhã = crédito + débito de hoje = R$ 910,00', c(fh['credito']) + c(fh['debito']) == c(F['cartao_a_creditar']['valor']))
mx = V['mix_mes']['grupos']
ok('mix por grupo: em cada um dos 11 grupos, Igor + Daniele + Outros = loja', all(c(g_['igor']) + c(g_['daniele']) + c(g_['outros']) == c(g_['loja']) for g_ in mx) and len(mx) == 11)
ok('mix: os grupos somam o realizado de cada um (loja R$ 92.400,00, Igor R$ 51.012,40, Daniele R$ 40.193,80, Outros R$ 1.193,80)',
   sum(c(g_['loja']) for g_ in mx) == c(mes['realizado']) and sum(c(g_['igor']) for g_ in mx) == c(igor['realizado_mes'])
   and sum(c(g_['daniele']) for g_ in mx) == c(dani['realizado_mes']) and sum(c(g_['outros']) for g_ in mx) == c(outros['realizado_mes']))
ok('mix: partes recalculadas e cada coluna soma 100% (± 0,2 de arredondamento)',
   all(hq(g_[k] / tot * 100, 1) == g_['parte_' + k] for g_ in mx for k, tot in [('loja', mes['realizado']), ('igor', igor['realizado_mes']), ('daniele', dani['realizado_mes'])])
   and all(abs(sum(g_['parte_' + k] for g_ in mx) - 100) <= 0.2 for k in ('loja', 'igor', 'daniele')))
ma = V['meses_anteriores']
ok('julho, agosto e setembro: Igor + Daniele + Outros = loja (R$ 145,0, 140,0 e 148,9 mil)', all(c(ma[m]['Igor']) + c(ma[m]['Daniele']) + c(ma[m]['Outros']) == c(ma[m]['loja']) for m in ('julho', 'agosto', 'setembro')))
ok('15/09: R$ 76,8 mil ÷ R$ 150 mil = 51,2%; ritmo 76,8 ÷ (150 × 12 ÷ 24) = 1,02; projeção em linha reta 76,8 ÷ 12 × 24 = R$ 153,6 mil',
   hq(e15['realizado'] / e15['meta'] * 100, 1) == 51.2 and hq(e15['realizado'] / (e15['meta'] * 12 / 24), 2) == 1.02 and c(e15['realizado']) / 12 * 24 == c(e15['projecao']))
v15 = e15['vendedores']
ok('15/09: Igor R$ 41,0 mil (54,7%, 1,09) + Daniele R$ 34,6 mil (46,1%, 0,92) + Outros R$ 1,2 mil = R$ 76,8 mil',
   sum(c(x['realizado']) for x in v15) == c(e15['realizado']) and all(hq(x['realizado'] / 75000 * 100, 1) == x['percentual_meta'] and hq(x['realizado'] / 37500, 2) == x['ritmo'] for x in v15 if 'ritmo' in x))
f15 = e15['financeiro']
ok('15/09: folga em 7 dias R$ 36.900,00 − R$ 29.400,00 = R$ 7.500,00; em 30 dias − R$ 35.600,00 = R$ 1.300,00; 63 + 38 + 29 + 11 = 141 comprados',
   c(f15['saldo']) - c(f15['a_pagar_7']) == c(f15['folga_7']) and c(f15['saldo']) - c(f15['a_pagar_30']) == c(f15['folga_30'])
   and sum(e15['compras'][k] for k in 'ABC') + e15['compras']['sem_venda'] == e15['compras']['comprados'])

# ============================================================ 4. COMPRAS
cp = CP['comprados']
ok('comprados em 90 dias: 66 A + 40 B + 31 C + 13 sem venda = 150', cp['A'] + cp['B'] + cp['C'] + cp['sem_venda'] == cp['total'] == 150)
ok('partes da barra das curvas: 66 ÷ 150 = 44,0%; 40 ÷ 150 = 26,7%; 31 ÷ 150 = 20,7%; 13 ÷ 150 = 8,7% (somam 100,1% pelo arredondamento, como no Design System)',
   all(hq(cp[k] / 150 * 100, 1) == cp['percentuais'][k] for k in ('A', 'B', 'C', 'sem_venda')) and round(sum(cp['percentuais'].values()), 1) == 100.1)
h30 = cp['ha_30_dias']
ok('há 30 dias: 61 + 37 + 30 + 10 = 138 comprados; 10 sem venda = a comparação do cartão Comprados sem venda', h30['A'] + h30['B'] + h30['C'] + h30['sem_venda'] == h30['total'] and h30['sem_venda'] == CP['comprados_sem_venda']['ha_30_dias'])
enc = CP['encalhe']['lista']
venc = sum(c(x['valor_parado']) for x in enc)
ok('encalhe: 38 produtos, cada um com valor parado = estoque × custo', len(enc) == 38 == CP['encalhe']['produtos'] and all(x['estoque'] * c(x['custo']) == c(x['valor_parado']) for x in enc))
ok(f'os 38 produtos parados somam {brl(venc / 100)} → R$ 24,6 mil', venc == c(CP['encalhe']['valor']) and mil(CP['encalhe']['valor']) == 'R$ 24,6 mil')
ok('encalhe: todos com estoque acima de zero, nenhuma venda desde 24/07 e lista em ordem de valor parado', all(x['estoque'] > 0 and x['ultima_venda'] < '2026-07-24' and x['liquido_90'] == 0 for x in enc)
   and [x['valor_parado'] for x in enc] == sorted([x['valor_parado'] for x in enc], reverse=True))
ok('encalhe há 30 dias: 30 produtos e R$ 19.740,00 → +8 produtos e +R$ 4,9 mil', CP['encalhe']['ha_30_dias']['produtos'] == 30 and 38 - 30 == 8 and mil(CP['encalhe']['valor'] - CP['encalhe']['ha_30_dias']['valor'], True) == '+R$ 4,9 mil')
comp90 = [x for x in enc if 'comprado_90' in x]
ok('encalhe com compra nos 90 dias: 5 produtos, todos antigos (vendiam antes) e com a compra dentro de 24/07 a 21/10; nota da Link sem valor, do ERP novo com valor = unidades × custo',
   len(comp90) == 5 and all('2026-07-24' <= x['comprado_90']['data'] <= '2026-10-21' and x['ultima_venda'] < x['comprado_90']['data'] for x in comp90)
   and all(('valor' in x['comprado_90']) == (x['comprado_90']['data'] >= '2026-09-28') for x in comp90)
   and all(c(x['comprado_90']['valor']) == x['comprado_90']['unidades'] * c(x['custo']) for x in comp90 if 'valor' in x['comprado_90']))
INI = D(2026, 9, 26)
okm = True
for x in enc:
    cpra = x.get('comprado_90')
    if cpra and d(cpra['data']) >= INI:
        serie = [x['estoque'] - cpra['unidades'] if y < d(cpra['data']) else x['estoque'] for y in dias(INI, HOJE)]
    else:
        serie = [x['estoque']] * 26
    okm &= hq(sum(serie) / 26, 1) == x['estoque_medio']
ok('estoque médio de cada produto parado = média do estoque no fim de cada dia, de 26/09 a 21/10 (26 dias)', okm)
nov = CP['comprados_sem_venda']['novos']
ok('comprados sem venda: 5 em encalhe + 8 novos em carência = 13', len(comp90) + len(nov) == 13 == CP['comprados_sem_venda']['produtos'] == CP['visoes']['Comprados sem venda'])
ok('novos: primeira compra a menos de 60 dias de 21/10, a partir de 28/09, sem venda; carência até a primeira compra + 60 dias',
   all((HOJE - d(x['primeira_entrada'])).days < 60 and x['primeira_entrada'] >= '2026-09-28' and x['quantidade_90'] == 0
       and d(x['carencia_ate']) == d(x['primeira_entrada']) + dt.timedelta(60) for x in nov))
okm = all(hq(sum(0 if y < d(x['primeira_entrada']) else x['estoque'] for y in dias(INI, HOJE)) / 26, 1) == x['estoque_medio'] for x in nov)
ok('estoque médio dos 8 novos confere com a data da primeira compra', okm)
nc = J['C3']['novo_em_carencia']
ok('produto novo da C3: 29/09 + 60 dias = 28/11; primeira compra há 22 dias', d(nc['carencia_ate']) == D(2026, 11, 28) and (HOJE - d(nc['primeira_entrada'])).days == 22 and 'há 22 dias' in MD)
rup = CP['ruptura']['lista']
ok('ruptura: 3 produtos (Dobradiça 35 mm, Corrediça 450 mm, Puxador 128 mm), todos curva A, estoque 0, cobertura 0 e venda nos 90 dias',
   [x['descricao'] for x in rup] == ['Dobradiça 35 mm', 'Corrediça 450 mm', 'Puxador 128 mm'] and all(x['classe_valor'] == 'A' and x['estoque'] == 0 and x['cobertura_dias'] == 0
                                                                                                  and '2026-07-24' <= x['ultima_venda'] <= '2026-10-21' for x in rup))
ok('ruptura na mesma ordem por R$ e por unidades (a ordem do cartão do Início e da visão Ruptura)', [x['liquido_90'] for x in rup] == sorted([x['liquido_90'] for x in rup], reverse=True)
   and [x['quantidade_90'] for x in rup] == sorted([x['quantidade_90'] for x in rup], reverse=True))
ok('giro da ruptura = unidades ÷ estoque médio (12,3; 8,9; 9,3)', all(hq(x['quantidade_90'] / x['estoque_medio'], 1) == x['giro'] for x in rup))
ok('ruptura há 30 dias: 1 → +2; comprados sem venda há 30 dias: 10 → +3; estoque negativo há 30 dias: 4 → −2',
   3 - CP['ruptura']['ha_30_dias'] == 2 and 13 - CP['comprados_sem_venda']['ha_30_dias'] == 3 and CP['estoque_negativo']['produtos'] - CP['estoque_negativo']['ha_30_dias'] == -2)
neg = CP['estoque_negativo']['lista']
ok('estoque negativo: 2 produtos, abaixo de zero e sem venda nos 90 dias (por isso fora da ruptura)', len(neg) == 2 and all(x['estoque'] < 0 and x['ultima_venda'] < '2026-07-24' for x in neg))
ok('custo zero: 7 produtos, todos com custo R$ 0,00 no cadastro', len(CP['custo_zero']['lista']) == 7 == CP['visoes']['Custo zero'] and all(x['custo'] == 0 for x in CP['custo_zero']['lista']))
vis = CP['visoes']
tc = vis['todos_composicao']
ok('visão Todos: 712 com venda + 38 em encalhe + 8 novos sem venda + 2 negativos sem venda = 760', sum(tc.values()) == vis['Todos'] == 760 and tc['encalhe'] == 38 and tc['novos sem venda'] == len(nov) and tc['estoque negativo sem venda'] == len(neg))
av, aq = CP['abc_valor'], CP['abc_quantidade']
ok('curva ABC por valor: 98 + 176 + 438 = 712 produtos; R$ 335.500,00 + R$ 63.150,00 + R$ 21.250,00 = R$ 419.900,00',
   sum(av[k]['produtos'] for k in 'ABC') == av['total']['produtos'] == 712 == vis['Curva ABC'] == tc['com venda nos 90 dias']
   and sum(c(av[k]['liquido']) for k in 'ABC') == c(av['total']['liquido']))
ok('curva ABC por quantidade: 84 + 160 + 468 = 712 produtos; 42.150 + 7.890 + 2.800 = 52.840 unidades', sum(aq[k]['produtos'] for k in 'ABC') == 712 and sum(aq[k]['quantidade'] for k in 'ABC') == aq['total']['quantidade'] == 52840)
ok('curva ABC: A até 80% e A + B até 95% (por valor: 79,9% e 94,9%; por quantidade: 79,8% e 94,7%), partes recalculadas',
   av['A']['liquido'] / av['total']['liquido'] <= 0.80 and (av['A']['liquido'] + av['B']['liquido']) / av['total']['liquido'] <= 0.95
   and aq['A']['quantidade'] / 52840 <= 0.80 and (aq['A']['quantidade'] + aq['B']['quantidade']) / 52840 <= 0.95
   and all(hq(av[k]['liquido'] / av['total']['liquido'] * 100, 1) == av[k]['parte'] and hq(aq[k]['quantidade'] / 52840 * 100, 1) == aq[k]['parte'] for k in 'ABC'))
vm = CP['vendas_90_dias_por_mes']
ok('a venda dos 90 dias (R$ 419.900,00) = 24 a 31/07 R$ 38.600,00 + agosto + setembro + outubro até 21/10 (R$ 92.400,00); agosto e setembro iguais aos da K2',
   sum(c(v) for k, v in vm.items() if k != 'origem') == c(av['total']['liquido']) and vm['agosto'] == ma['agosto']['loja'] and vm['setembro'] == ma['setembro']['loja'] and c(vm['outubro (até 21/10)']) == c(mes['realizado']))
ok('compras por classe cabem na curva: 66 ≤ 98 produtos A; 40 ≤ 176 B; 31 ≤ 438 C', cp['A'] <= av['A']['produtos'] and cp['B'] <= av['B']['produtos'] and cp['C'] <= av['C']['produtos'])
pg = CP['por_grupo']['grupos']
ok('visão por grupo: 760 produtos, 52.840 unidades e R$ 419.900,00 nos 11 grupos', sum(g_['produtos'] for g_ in pg) == 760 and sum(g_['quantidade_90'] for g_ in pg) == 52840 and sum(c(g_['liquido_90']) for g_ in pg) == c(av['total']['liquido']))
ok('visão por grupo: produtos em encalhe e valor parado de cada grupo = os da lista dos 38 (somam 38 e R$ 24.620,10)',
   all(g_['encalhe_produtos'] == len([x for x in enc if x['grupo'] == g_['grupo']]) and c(g_['valor_parado']) == sum(c(x['valor_parado']) for x in enc if x['grupo'] == g_['grupo']) for g_ in pg)
   and sum(g_['encalhe_produtos'] for g_ in pg) == 38 and sum(c(g_['valor_parado']) for g_ in pg) == venc)
ok('visão por grupo: giro = unidades ÷ estoque médio e cobertura = estoque ÷ (unidades ÷ 90), recalculados nos 11 grupos',
   all(hq(g_['quantidade_90'] / g_['estoque_medio'], 2) == g_['giro'] and int(hq(g_['estoque'] / (g_['quantidade_90'] / 90), 0)) == g_['cobertura_dias'] for g_ in pg))
top5 = [g_['grupo'] for g_ in sorted(pg, key=lambda g_: -g_['cobertura_dias'])[:5]]
ok('"Onde o estoque está parado" = os 5 grupos de maior cobertura (Iluminação LED 184, Acessórios 163, Puxadores 132, Ferramentas 118, Colas 97 dias)', top5 == [g_['grupo'] for g_ in CP['onde_esta_parado']])
pf = CP['por_fornecedor']['fornecedores']
ok('visão por fornecedor: 760 produtos, 52.840 unidades, R$ 419.900,00; encalhe e valor parado de cada um = os da lista',
   sum(x['produtos'] for x in pf) == 760 and sum(x['quantidade_90'] for x in pf) == 52840 and sum(c(x['liquido_90']) for x in pf) == c(av['total']['liquido'])
   and all(x['encalhe_produtos'] == len([y for y in enc if y['fornecedor'] == x['fornecedor']]) for x in pf) and sum(c(x['valor_parado']) for x in pf) == venc)
mai = CP['maiores_90_dias']
ok('12 maiores em R$: em ordem decrescente, com os 3 da ruptura, giro e cobertura recalculados; nenhum deles passa da classe A por valor',
   [x['liquido_90'] for x in mai] == sorted([x['liquido_90'] for x in mai], reverse=True) and len(mai) == 12 and sum(1 for x in mai if 'ruptura' in x['marcas']) == 3
   and all(hq(x['quantidade_90'] / x['estoque_medio'], 1) == x['giro'] for x in mai)
   and all(x['cobertura_dias'] == (0 if x['estoque'] <= 0 else int(hq(x['estoque'] / (x['quantidade_90'] / 90), 0))) for x in mai)
   and sum(c(x['liquido_90']) for x in mai) <= c(av['A']['liquido']))
c3 = J['C3']['principal']
ser = [x['estoque'] for x in c3['estoque_por_dia']]
ok('C3 (Corrediça oculta 500 mm): estoque 14 até 01/10 e 34 desde 02/10; estoque médio 29,4; valor parado 34 × R$ 58,00 = R$ 1.972,00',
   len(ser) == 26 and hq(sum(ser) / 26, 1) == c3['estoque_medio'] == 29.4 and c3['estoque'] * c(c3['custo']) == c(c3['valor_parado']) == 197200)
ent = c3['entradas']
ok('C3: comprou 24 (14/04), vendeu 10 (abr 3 + mai 5 + jun 2), sobraram 14 na troca de ERP, +20 em 02/10 = 34; nota de 02/10: 20 × R$ 58,00 = R$ 1.160,00',
   ent[1]['unidades'] - sum(x['quantidade'] for x in c3['venda_por_mes']) == 14 == ser[0] and 14 + ent[0]['unidades'] == 34 == ser[-1] and c(ent[0]['valor']) == ent[0]['unidades'] * c(ent[0]['custo_unitario']))
ok('C3: 90 anteriores = 7 un. × R$ 104,90 = R$ 734,30; venda por mês × preço', c(c3['anteriores_90']['liquido']) == 7 * 10490 and all(c(x['liquido']) == x['quantidade'] * 10490 for x in c3['venda_por_mes']))
nf = next(x for x in F['contas_a_pagar']['lista'] if x['documento'] == 'NF 48213')
ok('C3: a nota 48213 (02/10) é a conta da Ferragens Norte que vence em 22/10, R$ 6.480,00, lançada em 02/10', nf['vencimento'] == '2026-10-22' and nf['lancada_em'] == '2026-10-02' == ent[0]['data'] and nf['valor'] == 6480.0)
d35 = J['C3']['ruptura_dobradica_35']
s35 = {x['data']: x['estoque'] for x in d35['estoque_por_dia']}
vd = d35['vendas_desde_virada']
ok('C3, Dobradiça 35 mm: 300 na troca de ERP + 200 em 06/10 − 500 vendidas = 0 em 19/10; estoque nunca negativo; estoque médio 150,2; giro 1.840 ÷ 150,2 = 12,3',
   300 + 200 - sum(vd.values()) == 0 and s35['2026-10-19'] == 0 and min(s35.values()) >= 0 and hq(sum(s35.values()) / 26, 1) == d35['estoque_medio'] == 150.2 and hq(1840 / 150.2, 1) == d35['giro'])
ok('C3, Dobradiça 35 mm: 180 + 600 + 650 + 410 = 1.840 un. em 90 dias × R$ 7,00 = R$ 12.880,00; outubro = vendas de 01 a 19/10',
   sum(d35['venda_90_por_trecho'].values()) == d35['quantidade_90'] == 1840 and 1840 * 700 == c(d35['liquido_90'])
   and d35['venda_90_por_trecho']['outubro'] == sum(v for k, v in vd.items() if k >= '2026-10-01'))

# ============================================================ 5. FINANCEIRO
ctas = F['contas_a_pagar']
L_ = ctas['lista']
c7 = [x for x in L_ if x['vencimento'] <= '2026-10-28']
c30 = [x for x in L_ if x['vencimento'] <= '2026-11-20']
ok('as 5 contas de 22 a 28/10 somam R$ 33.100,00 (6.480 + 2.140 + 9.900 + 3.580 + 11.000); nenhuma vencida', len(c7) == 5 and sum(c(x['valor']) for x in c7) == c(ctas['ate_7_dias']['valor']) == 3310000
   and ctas['vencidas']['parcelas'] == 0 and all(x['vencimento'] >= '2026-10-21' for x in L_))
ok('folga em 7 dias = R$ 41.300,00 − R$ 33.100,00 = R$ 8.200,00', c(F['saldo_banco']['valor']) - sum(c(x['valor']) for x in c7) == c(F['folga_7']) == 820000)
ok('até 20/11: 11 parcelas somam R$ 39.100,00; folga em 30 dias = R$ 41.300,00 − R$ 39.100,00 = R$ 2.200,00',
   len(c30) == 11 == ctas['ate_30_dias']['parcelas'] and sum(c(x['valor']) for x in c30) == c(ctas['ate_30_dias']['valor']) == 3910000 and c(F['saldo_banco']['valor']) - 3910000 == c(F['folga_30']) == 220000)
ok('total em aberto: 22 parcelas, R$ 84.300,00', len(L_) == ctas['total']['parcelas'] == 22 and sum(c(x['valor']) for x in L_) == c(ctas['total']['valor']) == 8430000)
s, okp = c(F['saldo_banco']['valor']), True
for x in F['saldo_previsto']:
    s -= sum(c(y['valor']) for y in L_ if y['vencimento'] == x['data'])
    okp &= s == c(x['saldo_previsto'])
ok('saldo previsto dia a dia (20/10 a 20/11) = saldo − contas acumuladas; 28/10 = folga em 7 dias; 20/11 = folga em 30 dias; nunca abaixo de zero',
   okp and c(prev['2026-10-28']) == c(F['folga_7']) and c(F['saldo_previsto'][-1]['saldo_previsto']) == c(F['folga_30']) and min(x['saldo_previsto'] for x in F['saldo_previsto']) > 0)
ok('o cartão a creditar (R$ 910,00) fica fora da linha: com ele, 28/10 daria R$ 9,1 mil, e não R$ 8,2 mil', mil(F['folga_7'] + F['cartao_a_creditar']['valor']) == 'R$ 9,1 mil' and mil(prev['2026-10-28']) == 'R$ 8,2 mil')
ok('contas por semana: R$ 8.620,00 (22 e 23/10) + R$ 24.480,00 (26 a 28/10) = R$ 33.100,00; 26,0% e 74,0%',
   c(F['semanas'][0]['valor']) + c(F['semanas'][1]['valor']) == 3310000 and pct(F['semanas'][0]['valor'] / 33100 * 100) == '26,0%' and pct(F['semanas'][1]['valor'] / 33100 * 100) == '74,0%')
h14 = F['historico_14_10']
pagas = h14['pagas_de_14_a_21']
ok('folga de 7 dias atrás: saldo de 13/10 R$ 37.620,00 − 6 contas de 14 a 21/10 (R$ 26.120,00, já pagas) = R$ 11.500,00 → R$ 11,5 mil; diferença −R$ 3,3 mil',
   len(pagas) == 6 and sum(c(x['valor']) for x in pagas) == c(h14['soma_pagas']) == 2612000 and c(h14['saldo_usado']['valor']) - 2612000 == c(F['folga_7_ha_7_dias']) == 1150000
   and all('2026-10-14' <= x['vencimento'] <= '2026-10-21' for x in pagas) and mil(F['folga_7'] - F['folga_7_ha_7_dias']) == '−R$ 3,3 mil')
hist = J['K1']['historico']
ok('o saldo que a folga de 14/10 usou é o último digitado até 14/10: o de 13/10, R$ 37.620,00', max((x for x in hist if x['data'] <= '2026-10-14'), key=lambda x: x['data'])['data'] == h14['saldo_usado']['data'] == '2026-10-13'
   and next(x for x in hist if x['data'] == '2026-10-13')['valor'] == h14['saldo_usado']['valor'])
nov14 = [x for x in L_ if x['lancada_em'] > '2026-10-14']
ok('total de 14/10: R$ 84.300,00 − R$ 22.300,00 lançadas depois (11 parcelas) + R$ 26.120,00 pagas (6) = R$ 88.120,00 em 17 parcelas; diferença −R$ 3.820,00',
   sum(c(x['valor']) for x in nov14) == c(h14['soma_lancadas_depois']) == 2230000 and len(nov14) == 11 and 8430000 - 2230000 + 2612000 == c(ctas['total_ha_7_dias']['valor']) == 8812000
   and 22 - 11 + 6 == ctas['total_ha_7_dias']['parcelas'] == 17)
con = [x for x in L_ if x['lancada_em'] <= '2026-10-14' and '2026-10-22' <= x['vencimento'] <= '2026-11-13']
ok('folga em 30 dias de 7 dias atrás: R$ 11.500,00 − R$ 35.500,00 (contas de 22/10 a 13/11 já lançadas em 14/10) = −R$ 24.000,00', 1150000 - sum(c(x['valor']) for x in con) == c(F['folga_30_ha_7_dias']) == -2400000)
ok('contas lançadas até hoje e com vencimento depois do lançamento', all(x['lancada_em'] <= '2026-10-21' and x['lancada_em'] < x['vencimento'] for x in L_))
ok('parcelas da mesma nota têm o mesmo valor e numeração sem buraco (NF 1184: 2, 3 e 4 de 4; NF 48877: 1 a 3 de 3; NF 7781, NF 2209, NF 10044 e NF 5577)',
   all(len({x['valor'] for x in L_ if x['documento'] == nf_}) == 1 for nf_ in ('NF 1184', 'NF 48877', 'NF 7781', 'NF 2209', 'NF 10044', 'NF 5577'))
   and sorted(x['parcela'] for x in L_ if x['documento'] == 'NF 1184') == ['2 de 4', '3 de 4', '4 de 4'])
ok('folga negativa (estado): com saldo de R$ 29.900,00, folga em 7 dias = −R$ 3.200,00 e o primeiro dia negativo do saldo previsto é 28/10',
   2990000 - 3310000 == -320000 and next(x['data'] for x in F['saldo_previsto'] if 2990000 - (c(F['saldo_banco']['valor']) - c(x['saldo_previsto'])) < 0) == '2026-10-28')
fm = F['fluxo_mes']
ok(f'fluxo do mês: entradas por forma somam R$ 92.180,00 (Pix {pct(fm["entradas"]["pix"] / fm["entradas_total"] * 100)}, cartão {pct((fm["entradas"]["credito"] + fm["entradas"]["debito"]) / fm["entradas_total"] * 100)}, dinheiro {pct(fm["entradas"]["dinheiro"] / fm["entradas_total"] * 100)}; a loja: 70/22/7)',
   sum(c(v) for v in fm['entradas'].values()) == c(fm['entradas_total']) == 9218000 and abs(fm['entradas']['pix'] / fm['entradas_total'] - 0.70) < 0.01
   and abs((fm['entradas']['credito'] + fm['entradas']['debito']) / fm['entradas_total'] - 0.22) < 0.01)
ok('K1: 10 saldos, do mais novo ao mais velho; o último é R$ 41.300,00 para 20/10, digitado em 21/10 às 07h12; o de 19/10 é R$ 43.150,00 (texto do Apagar); o de 01/10 é R$ 48.000,00',
   len(hist) == 10 and [x['data'] for x in hist] == sorted([x['data'] for x in hist], reverse=True) and hist[0]['valor'] == 41300.0 == J['K1']['ultimo']['valor']
   and hist[0]['quando'] == J['K1']['ultimo']['quando'] and hist[1]['valor'] == 43150.0 and brl(hist[1]['valor']) in J['K1']['apagar'] and hist[-1]['valor'] == 48000.0)

# ============================================================ 6. CAIXA
d20 = CX['dia_20_10']
fe = d20['fechamento']['formas']
g20 = d20['gaveta']
ok('fechamento de 20/10: quebra de cada forma = informado − calculado; total R$ 0,00 (bateu nas 4 formas)', all(c(x['informado']) - c(x['calculado']) == c(x['quebra']) == 0 for x in fe) and len(fe) == 4)
ok('gaveta de 20/10: R$ 470,00 + R$ 150,00 − R$ 390,00 − R$ 80,00 = R$ 150,00 = o calculado do dinheiro',
   c(g20['vendas_dinheiro']) + c(g20['suprimentos']) - c(g20['sangrias']) - c(g20['devolucoes_dinheiro']) == c(g20['gaveta']) == c(fe[0]['calculado']) == 15000)
mov = d20['movimentos']
ok('movimentos de 20/10: suprimento R$ 150,00 e sangrias R$ 200,00 + R$ 190,00 = R$ 390,00, iguais aos da gaveta',
   sum(c(x['valor']) for x in mov if x['tipo'] == 'Sangria') == c(g20['sangrias']) and sum(c(x['valor']) for x in mov if x['tipo'] == 'Suprimento') == c(g20['suprimentos']))
vpf = d20['vendas_por_forma']
ok('20/10: vendas por forma somam o vendido (R$ 5.980,00); − R$ 80,00 de devolução = R$ 5.900,00 = a barra de 20/10 da V1; Pix, crédito e débito calculados = vendidos',
   sum(c(v) for v in vpf.values()) == c(d20['vendido']) and c(d20['vendido']) - c(d20['devolucoes']) == c(d20['realizado']) == c(next(x['realizado'] for x in V['por_dia'] if x['data'] == '2026-10-20'))
   and c(fe[1]['calculado']) == c(vpf['pix']) and c(fe[2]['calculado']) == c(vpf['credito']) and c(fe[3]['calculado']) == c(vpf['debito']) and c(g20['vendas_dinheiro']) == c(vpf['dinheiro']))
d9 = CX['dia_09_10_fora']
ok('09/10 (fora): débito R$ 652,00 − R$ 690,00 = −R$ 38,00, acima da tolerância de R$ 5,00; gaveta R$ 150,00; vendido − devoluções = R$ 6.400,00 = a barra de 09/10 da V1',
   sum(c(x['informado']) - c(x['calculado']) for x in d9['formas']) == -3800 and abs(-38) > CX['mes']['tolerancia'] and c(d9['gaveta']['gaveta']) == 15000
   and c(d9['vendido']) - c(d9['devolucoes']) == c(next(x['realizado'] for x in V['por_dia'] if x['data'] == '2026-10-09')) and sum(c(v) for v in d9['vendas_por_forma'].values()) == c(d9['vendido']))
tur = CX['mes']['turnos']
ok('mês: 16 fechamentos; quebras somam −R$ 42,50 (dinheiro −R$ 4,50; débito −R$ 38,00); média −R$ 2,66 por fechamento',
   len(tur) == 16 == CX['mes']['fechamentos'] and sum(c(t['quebra']) for t in tur) == c(CX['mes']['quebra_total']) == -4250
   and all(sum(c(t['quebra_formas'][k]) for t in tur) == c(v) for k, v in CX['mes']['por_forma'].items()) and hq(-42.50 / 16, 2) == CX['mes']['media_por_fechamento'])
ok('mês: só 09/10 passa da tolerância de R$ 5,00 (02/10 tem −R$ 5,00, que não passa); quebra de 20/10 = R$ 0,00',
   [t['data'] for t in tur if t['estado'] == 'fora'] == ['2026-10-09'] and all((abs(c(t['quebra'])) > 500) == (t['estado'] == 'fora') for t in tur) and tur[-1]['quebra'] == 0
   and all(sum(c(v) for v in t['quebra_formas'].values()) == c(t['quebra']) for t in tur))
ok('mês: números de fechamento em sequência (nº 200 a 215) e o de 20/10 é o do cartão', [t['fechamento_numero'] for t in tur] == list(range(200, 216)) and tur[-1]['fechamento_numero'] == d20['fechamento']['numero'])
g21 = CX['dia_21_10_ate_14h05']['gaveta']
ok('gaveta de hoje até 14h05: R$ 320,00 (= dinheiro das vendas de hoje) + R$ 150,00 − R$ 200,00 = R$ 270,00',
   c(g21['vendas_dinheiro']) == c(dia['formas']['dinheiro']) and c(g21['vendas_dinheiro']) + c(g21['suprimentos']) - c(g21['sangrias']) - c(g21['devolucoes_dinheiro']) == c(g21['gaveta']) == 27000)

# ============================================================ 7. METAS
mo = M['outubro']
ok('K2 outubro: Igor R$ 75.000,00 + Daniele R$ 75.000,00 = R$ 150.000,00 = meta da loja; diferença R$ 0,00', c(mo['Igor']) + c(mo['Daniele']) == c(mo['loja']) == c(mes['meta']) and mo['Igor'] == igor['meta'] and mo['Daniele'] == dani['meta'])
aj = M['ajuste_igor_exemplo']['conferencia_depois']
ok('K2 depois do ajuste do Igor para R$ 60.000,00: R$ 135.000,00 nos vendedores, diferença de R$ 15.000,00 para a loja', 6000000 + c(mo['Daniele']) == c(aj['soma_vendedores']) and c(aj['loja']) - c(aj['soma_vendedores']) == c(aj['diferenca']))
mn = M['novembro']
dz = [x for x in dias(D(2026, 12, 1), D(2026, 12, 31)) if util(x)]
ok('K2 novembro: Igor R$ 72.500,00 + Daniele R$ 72.500,00 = R$ 145.000,00 = meta da loja; dezembro sem meta, 26 dias úteis (menos 25/12)',
   c(mn['Igor']) + c(mn['Daniele']) == c(mn['loja']) == 14500000 and M['dezembro']['loja'] is None and len(dz) == 26 == M['dezembro']['dias_uteis'])
ok('K2: a lista de meses vai de abril de 2026 a outubro de 2027 (19 meses)', len(M['meses_da_lista']) == 19 and M['meses_da_lista'][0] == '4/2026' and M['meses_da_lista'][-1] == '10/2027')
ok('K2: dias úteis de outubro 26, setembro 24 e novembro 24 iguais aos do calendário', mo['dias_uteis'] == len(out) and M['setembro']['dias_uteis'] == len(st) and M['novembro']['dias_uteis'] == len(nv))

# ============================================================ 8. O LIVRO (dados-exemplo.md)
proib = [n for n in ['Erleide', 'Wallace', 'Ribamar', 'Luis Henrique', 'israel5550123'] if n in MD]
ok('o livro não dá nome à gerente nem a outras pessoas da equipe (só Igor, Daniele, Outros e o dono Israel)', not proib, ', '.join(proib))
emails = set(re.findall(r'[\w.+-]+@[\w-]+\.[\w.]+', MD))
ok('e-mails do livro só no domínio reservado example.com', all(e.endswith('@example.com') for e in emails), ', '.join(emails))
chaves = [brl(CP['encalhe']['valor']), brl(mes['projecao']), brl(ctas['ate_30_dias']['valor']), brl(ctas['total']['valor']), brl(ctas['total_ha_7_dias']['valor']),
          brl(F['folga_30_ha_7_dias']), mil(F['folga_30_ha_7_dias']), brl(V['media_dias_completos']), brl(CX['mes']['quebra_total']), brl(CX['mes']['media_por_fechamento'])] + \
         [brl(x['valor_parado']) for x in enc] + [brl(x['valor']) for x in L_] + [brl(x['realizado']) for x in V['por_dia']] + \
         [brl(g_[k]) for g_ in mx for k in ('igor', 'daniele')] + [brl(x['acumulado']) for x in V['por_dia']] + [brl(x['saldo_previsto']) for x in F['saldo_previsto'] if x['saidas']]
falt = [k for k in chaves if k not in MD]
ok(f'{len(chaves)} valores do JSON (encalhe, contas, vendas por dia, acumulado, mix, saldo previsto, caixa) aparecem iguais no livro', not falt, '; '.join(falt[:8]))
ok('o livro marca a origem de cada número (DS ou novo) e tem uma seção por tela, de G1 a K2', all(f'## {t} ·' in MD for t in ['G1', 'I1', 'V1', 'V2', 'C1', 'C2', 'C3', 'F1', 'F2', 'K1', 'F3', 'K2'])
   and MD.count('| DS |') > 40 and MD.count('| novo |') > 40)

# ============================================================ resultado
linhas = [f'{d_}: {"ok" if b else "FALHOU"}' + (f' ({x})' if (x and not b) else '') for d_, b, x in RES]
(AQUI / 'conferencias.txt').write_text('\n'.join(linhas) + '\n')
print('\n'.join(linhas))
falhas = [x for x in RES if not x[1]]
print(f'\n{len(RES)} conferências, {len(falhas)} falhas')
sys.exit(1 if falhas else 0)
