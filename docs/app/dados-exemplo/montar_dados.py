# Monta o livro de dados de exemplo das telas da Fase 5 (G1 a K2) em dados-exemplo.json.
# Regra: o que veio do Design System (versão 1790997087-c8ea) fica igual ("canonico");
# o que falta é inventado aqui ("novo") e calculado a partir dos canônicos, para tudo fechar.
# Dinheiro em centavos (int) por dentro; no JSON, reais com duas casas.
import json, datetime as dt, pathlib
from decimal import Decimal, ROUND_HALF_UP

AQUI = pathlib.Path(__file__).parent
D = dt.date
HOJE = D(2026, 10, 21)
C, N = 'canonico', 'novo'


def r(c):  # centavos -> reais (float com duas casas)
    return round(c / 100, 2)


def c(v):  # reais -> centavos
    return int(Decimal(str(v)).scaleb(2).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def hq(x, casas):
    return float(Decimal(str(x)).quantize(Decimal(1).scaleb(-casas), rounding=ROUND_HALF_UP))


def iso(d):
    return d.isoformat()


def dias(a, b):  # de a até b, inclusive
    x = a
    while x <= b:
        yield x
        x += dt.timedelta(1)


FECHADOS = {D(2026, 5, 1): 'Dia do Trabalho', D(2026, 9, 7): 'Independência',
            D(2026, 9, 26): 'Inventário da troca de ERP', D(2026, 10, 12): 'Nossa Senhora Aparecida',
            D(2026, 11, 2): 'Finados', D(2026, 12, 25): 'Natal'}
FECHADOS_CANON = {D(2026, 5, 1), D(2026, 9, 7), D(2026, 9, 26), D(2026, 10, 12)}


def util(d):
    return d.weekday() < 6 and d not in FECHADOS


def uteis_mes(ano, mes):
    a = D(ano, mes, 1)
    b = (D(ano + (mes == 12), mes % 12 + 1, 1) - dt.timedelta(1))
    return [d for d in dias(a, b) if util(d)]


J = {}
J['sobre'] = {
    'titulo': 'Livro de dados de exemplo das telas da Fase 5 (G1 a K2)',
    'design_system': '1790997087-c8ea',
    'legenda': {C: 'veio do Design System (README ou pranchas) e não muda', N: 'inventado agora, calculado para fechar com o resto'},
}

# ---------------------------------------------------------------- BASE COMUM
out_uteis = uteis_mes(2026, 10)
set_uteis = uteis_mes(2026, 9)
nov_uteis = uteis_mes(2026, 11)
J['base'] = {
    'hoje': iso(HOJE), 'hora': '14h05', 'proxima': '15h', 'origem': C,
    'atualizado': 'Atualizado às 14h05 · próxima às 15h',
    'pessoa': {'nome': 'Israel', 'perfil': 'Dono', 'iniciais': 'IS', 'origem': C},
    'pessoas_nas_telas': ['Igor', 'Daniele', 'Outros (sem meta própria)', 'Israel (só o dono: conta, Entrar, quem digitou)'],
    'loja': {'abre': '7h', 'fecha': '18h', 'sabado_fecha': '12h', 'dias': 'segunda a sábado', 'origem': N,
             'nota': 'horário da docs/LOJA.md; sábado é meio expediente, mas conta como dia útil inteiro'},
    'dias_sem_expediente': [
        {'data': iso(d), 'descricao': FECHADOS[d], 'origem': C if d in FECHADOS_CANON else N} for d in sorted(FECHADOS)],
    'outubro': {'dias_uteis': len(out_uteis), 'decorridos': len([d for d in out_uteis if d <= HOJE]),
                'uteis': [d.day for d in out_uteis], 'domingos': [d.day for d in dias(D(2026, 10, 1), D(2026, 10, 31)) if d.weekday() == 6],
                'origem': C},
    'setembro': {'dias_uteis': len(set_uteis), 'decorridos_ate_15': len([d for d in set_uteis if d <= D(2026, 9, 15)]), 'origem': C},
    'novembro': {'dias_uteis': len(nov_uteis), 'fechados': ['2026-11-02'], 'origem': N,
                 'nota': '02/11 (Finados) marcado; 20/11 (Consciência Negra) a loja abre e não entra'},
    'regua': {'ritmo': 'no lugar com 1,00 ou mais; atenção de 0,90 a 0,99; fora abaixo de 0,90',
              'folga': 'fora com folga em 7 dias negativa; atenção com folga em 30 dias negativa',
              'ruptura_curva_A': 'acima de 0 é fora', 'caixa': 'quebra acima de R$ 5,00, para mais ou para menos, é fora',
              'saldo': 'velho depois de 3 dias (atenção)', 'origem': 'proposta da TELAS.md, pergunta 5 (provisória)'},
}

# ---------------------------------------------------------------- VENDAS
# vendas de cada dia (canônico, em mil, prancha Gráficos); o valor exato em reais é novo e arredonda para o canônico
DIAS_CANON = [(1, 5.8), (2, 6.2), (3, 3.4), (4, 0), (5, 5.9), (6, 6.3), (7, 5.7), (8, 6.0), (9, 6.4), (10, 3.5), (11, 0),
              (12, 0), (13, 6.1), (14, 5.8), (15, 6.0), (16, 6.2), (17, 3.6), (18, 0), (19, 5.5), (20, 5.9), (21, 4.1)]
AJUSTE = {1: 1240, 2: -3120, 3: 2750, 5: -1890, 6: 4130, 7: -2260, 8: 870, 9: 0, 10: 1980, 13: 3310, 14: -1450,
          15: -2730, 16: 420, 17: -980, 20: 0, 21: 0}
AJUSTE[19] = -sum(AJUSTE.values())
vdia = []
for d, v in DIAS_CANON:
    cent = int(round(v * 100000)) + (AJUSTE.get(d, 0) if v else 0)
    vdia.append({'data': iso(D(2026, 10, d)), 'realizado': r(cent), 'mil_canonico': v})
acc = 0
meta_dia_c = 15000000 / 26  # centavos por dia útil
macc = 0.0
for x in vdia:
    dd = D.fromisoformat(x['data'])
    acc += c(x['realizado'])
    if util(dd):
        macc += meta_dia_c
    x['acumulado'] = r(acc)
    x['meta_acumulada'] = r(round(macc))
    x['dia_util'] = util(dd)
    x['situacao'] = ('hoje, até 14h05' if dd == HOJE else ('domingo' if dd.weekday() == 6 else (
        'feriado (sem expediente)' if dd in FECHADOS else ('sábado (meio expediente)' if dd.weekday() == 5 else 'dia completo'))))

real_mes = acc
ate_ontem = acc - c(vdia[-1]['realizado'])
completos = [x for x in vdia if x['realizado'] > 0 and x['data'] != iso(HOJE)]

HORAS = [('8h', 31000, 2, 0.3), ('9h', 59000, 4, 0.6), ('10h', 92000, 5, 0.9), ('11h', 78000, 4, 0.8),
         ('12h', 41000, 3, 0.4), ('13h', 68000, 5, 0.7), ('14h', 41000, 1, 0.4)]

MEDIAS_8_SEMANAS = {'seg': 591250, 'ter': 600480, 'qua': 598760, 'qui': 609340, 'sex': 621130, 'sáb': 349720}
restantes = [d for d in out_uteis if d >= HOJE]
NOMES = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
proj_c = ate_ontem + sum(MEDIAS_8_SEMANAS[NOMES[d.weekday()]] for d in restantes)

vend = {
    'Igor': {'codigo': 11, 'realizado_mes': 5101240, 'meta': 7500000, 'realizado_dia': 229640, 'vendas_mes': 341,
             'vendas_dia': 13, 'clientes_atendidos': 128},
    'Daniele': {'codigo': 12, 'realizado_mes': 4019380, 'meta': 7500000, 'realizado_dia': 165870, 'vendas_mes': 279,
                'vendas_dia': 10, 'clientes_atendidos': 104},
}
outros = {'realizado_mes': 119380, 'realizado_dia': 14490, 'vendas_mes': 22, 'vendas_dia': 1}
assert vend['Igor']['realizado_mes'] + vend['Daniele']['realizado_mes'] + outros['realizado_mes'] == real_mes


def regua_ritmo(x):
    return 'no lugar' if x >= 1.0 else ('atenção' if x >= 0.90 else 'fora')


frac = 17 / 26
vendedores = []
for nome, v in vend.items():
    rit = v['realizado_mes'] / v['meta'] / frac
    vendedores.append({
        'nome': nome, 'codigo': v['codigo'], 'realizado_mes': r(v['realizado_mes']), 'meta': r(v['meta']),
        'percentual_meta': hq(v['realizado_mes'] / v['meta'] * 100, 1), 'ritmo': hq(rit, 2), 'ritmo_exato': round(rit, 4),
        'estado': regua_ritmo(hq(rit, 2)), 'falta': r(v['meta'] - v['realizado_mes']),
        'realizado_dia': r(v['realizado_dia']), 'vendas_mes': v['vendas_mes'], 'vendas_dia': v['vendas_dia'],
        'clientes_atendidos': v['clientes_atendidos'],
        'origem': {'realizado_mes(mil)': C, 'meta': C, 'percentual_meta': C, 'ritmo': C, 'resto': N}})
vendedores.sort(key=lambda x: x['ritmo'])  # pior ritmo primeiro

rit_loja = real_mes / 15000000 / frac
J['vendas'] = {
    'mes': {
        'meta': 150000.0, 'realizado': r(real_mes), 'percentual_meta': hq(real_mes / 15000000 * 100, 1),
        'ritmo': hq(rit_loja, 2), 'ritmo_exato': round(rit_loja, 4), 'estado': 'atenção',
        'dias_uteis': 26, 'decorridos': 17, 'faltam_dias': 9,
        'meta_ate_hoje': r(round(15000000 * 17 / 26)), 'falta': r(15000000 - real_mes),
        'por_dia_util_restante': r(round((15000000 - real_mes) / 9)),
        'projecao': r(proj_c), 'projecao_menos_meta': r(proj_c - 15000000),
        'realizado_ate_ontem': r(ate_ontem),
        'medias_8_semanas': {k: r(v) for k, v in MEDIAS_8_SEMANAS.items()},
        'dias_restantes_contando_hoje': [iso(d) for d in restantes],
        'vendido': 93540.00, 'devolucoes': 1140.00, 'vendas': 642, 'sem_vendedor': {'itens': 0, 'valor': 0.0},
        'origem': {'meta': C, 'realizado': C, 'percentual_meta': C, 'ritmo': C, 'dias': C, 'projecao': C,
                   'meta_ate_hoje': C, 'falta': C, 'medias_8_semanas': N, 'vendido/devolucoes/vendas': N,
                   'por_dia_util_restante': N}},
    'dia': {'realizado': 4100.00, 'vendido': 4100.00, 'devolucoes': 0.0, 'vendas': 24, 'ate': '14h05',
            'dia_como_hoje': 3800.00, 'diferenca_dia_como_hoje': 300.00,
            'formas': {'pix': 2870.00, 'credito': 540.00, 'debito': 370.00, 'dinheiro': 320.00},
            'sem_vendedor': {'itens': 0, 'valor': 0.0},
            'origem': {'realizado/vendas/dia_como_hoje': C, 'vendido/devolucoes/formas': N}},
    'por_dia': vdia,
    'media_dias_completos': r(round(sum(c(x['realizado']) for x in completos) / len(completos))),
    'dias_completos': len(completos),
    'por_hora': [{'hora': h, 'realizado': r(v), 'vendas': n, 'mil_canonico': m} for h, v, n, m in HORAS],
    'vendedores': vendedores,
    'outros': {'nome': 'Outros (sem meta própria)', 'realizado_mes': r(outros['realizado_mes']),
               'realizado_dia': r(outros['realizado_dia']), 'vendas_mes': outros['vendas_mes'], 'vendas_dia': outros['vendas_dia'],
               'nota': 'venda de quem não é vendedor no ERP (hoje, a gerente); conta só na meta da loja',
               'origem': {'realizado_mes(mil)': C, 'resto': N}},
    'excecao_sem_vendedor_exemplo_de_estado': {'itens_mes': 3, 'valor_mes': 112.50, 'itens_dia': 0, 'valor_dia': 0.0, 'origem': N},
}

# mix do mês por grupo (V2)
GRUPOS = ['Dobradiças', 'Corrediças', 'Puxadores', 'Parafusos e fixação', 'Fitas de borda', 'Chapas de MDF',
          'Colas e adesivos', 'Acessórios de cozinha', 'Iluminação LED', 'Ferramentas e abrasivos', 'Sem grupo']
MIX_LOJA = [1830000, 1617000, 1220000, 1016000, 887000, 822000, 591000, 490000, 379000, 333000, 55000]
assert sum(MIX_LOJA) == real_mes
MIX_OUTROS = [9420, 0, 6180, 41230, 12160, 0, 23650, 0, 0, 19840, 6900]
assert sum(MIX_OUTROS) == outros['realizado_mes']
PARTE_DANIELE = [16.0, 13.4, 12.9, 14.6, 12.1, 8.6, 8.0, 5.6, 4.4, 3.6, 0.8]
dan = [int(round(vend['Daniele']['realizado_mes'] * p / 100)) for p in PARTE_DANIELE]
dan[0] += vend['Daniele']['realizado_mes'] - sum(dan)
igor = [MIX_LOJA[i] - dan[i] - MIX_OUTROS[i] for i in range(len(GRUPOS))]
assert sum(igor) == vend['Igor']['realizado_mes'] and min(igor) > 0
mix = []
for i, g in enumerate(GRUPOS):
    mix.append({'grupo': g, 'loja': r(MIX_LOJA[i]), 'igor': r(igor[i]), 'daniele': r(dan[i]), 'outros': r(MIX_OUTROS[i]),
                'parte_loja': hq(MIX_LOJA[i] / real_mes * 100, 1),
                'parte_igor': hq(igor[i] / vend['Igor']['realizado_mes'] * 100, 1),
                'parte_daniele': hq(dan[i] / vend['Daniele']['realizado_mes'] * 100, 1)})
J['vendas']['mix_mes'] = {'grupos': mix, 'origem': N,
                          'nota': 'ordem do maior para o menor na loja; cada vendedor ordena pelo próprio valor'}
J['vendas']['clientes_atendidos_fase8_daniele'] = {
    'origem': N, 'fase': 8, 'total': 104,
    'maiores': [{'cliente': 'Marcenaria São Francisco', 'realizado': 2180.40}, {'cliente': 'Móveis Planejados Calhau', 'realizado': 1940.00},
                {'cliente': 'Oficina Monte Castelo', 'realizado': 1615.20}, {'cliente': "Marcenaria Ponta d'Areia", 'realizado': 1402.90},
                {'cliente': 'Arte em Madeira Renascença', 'realizado': 1288.00}]}

# três meses anteriores (K2) e exemplo de 15/09
J['vendas']['meses_anteriores'] = {
    'origem': N,
    'julho': {'loja': 145000.0, 'Igor': 76200.0, 'Daniele': 66100.0, 'Outros': 2700.0},
    'agosto': {'loja': 140000.0, 'Igor': 72800.0, 'Daniele': 64900.0, 'Outros': 2300.0},
    'setembro': {'loja': 148900.0, 'Igor': 78400.0, 'Daniele': 68000.0, 'Outros': 2500.0},
    'nota': 'julho e agosto seguem a docs/LOJA.md (145 e 140 mil); setembro é novo, depois do cartão de 15/09'}
s_frac = 12 / 24
J['vendas']['exemplo_15_09'] = {
    'data': '2026-09-15', 'meta': 150000.0, 'realizado': 76800.0, 'percentual_meta': hq(768 / 1500 * 100, 1),
    'ritmo': hq(76800 / 150000 / s_frac, 2), 'decorridos': 12, 'dias_uteis': 24, 'projecao': 153600.0,
    'estado': 'no lugar', 'faixa': 'Você está vendo terça, 15/09/2026 · calculado em 20/10 às 22h04',
    'origem': {'meta/realizado/%/ritmo/dias/projecao/faixa': C, 'vendedores': N, 'compras/financeiro': N},
    'vendedores': [
        {'nome': 'Igor', 'realizado': 41000.0, 'meta': 75000.0, 'percentual_meta': hq(410 / 750 * 100, 1), 'ritmo': hq(41000 / 75000 / s_frac, 2)},
        {'nome': 'Daniele', 'realizado': 34600.0, 'meta': 75000.0, 'percentual_meta': hq(346 / 750 * 100, 1), 'ritmo': hq(34600 / 75000 / s_frac, 2)},
        {'nome': 'Outros (sem meta própria)', 'realizado': 1200.0}],
    'compras': {'periodo': '18/06 a 15/09', 'comprados': 141, 'A': 63, 'B': 38, 'C': 29, 'sem_venda': 11,
                'estoque': 'estoque desconhecido antes de 26/09/2026 (sem encalhe e sem ruptura)'},
    'financeiro': {'saldo': 36900.0, 'saldo_data': '2026-09-14', 'a_pagar_7': 29400.0, 'contas_7': 4,
                   'folga_7': 7500.0, 'a_pagar_30': 35600.0, 'folga_30': 1300.0, 'quebra': 0.0, 'quebra_data': '2026-09-15'},
    'nota': 'a projeção de R$ 153,6 mil é conta em linha reta (76,8 ÷ 12 × 24), não a regra do Kaizen; é canônica e fica'}

# ---------------------------------------------------------------- COMPRAS
CLASSES = {'A': 66, 'B': 40, 'C': 31, 'sem_venda': 13}
J['compras'] = {
    'periodo': {'de': '2026-07-24', 'ate': '2026-10-21', 'texto': '90 dias até 21/10 (24/07 a 21/10)', 'origem': C},
    'comprados': {'total': 150, **CLASSES, 'percentuais': {'A': 44.0, 'B': 26.7, 'C': 20.7, 'sem_venda': 8.7},
                  'frase': 'Comprou 150 produtos em 90 dias: 66 curva A, 40 B, 31 C e 13 sem venda', 'origem': C,
                  'ha_30_dias': {'total': 138, 'A': 61, 'B': 37, 'C': 30, 'sem_venda': 10, 'origem': N}},
    'estoque_conhecido_desde': '2026-09-26',
    'rodape': 'Estoque conhecido desde 26/09/2026. Valor parado pelo custo atual do cadastro.',
}

# ABC dos 90 dias (produtos vendidos: 712)
ABC_VALOR = {'A': (98, 33550000), 'B': (176, 6315000), 'C': (438, 2125000)}
ABC_QTD = {'A': (84, 42150), 'B': (160, 7890), 'C': (468, 2800)}
tot_v = sum(v for _, v in ABC_VALOR.values())
tot_q = sum(v for _, v in ABC_QTD.values())
J['compras']['abc_valor'] = {k: {'produtos': p, 'liquido': r(v), 'parte': hq(v / tot_v * 100, 1)} for k, (p, v) in ABC_VALOR.items()}
J['compras']['abc_valor']['total'] = {'produtos': sum(p for p, _ in ABC_VALOR.values()), 'liquido': r(tot_v)}
J['compras']['abc_quantidade'] = {k: {'produtos': p, 'quantidade': v, 'parte': hq(v / tot_q * 100, 1)} for k, (p, v) in ABC_QTD.items()}
J['compras']['abc_quantidade']['total'] = {'produtos': sum(p for p, _ in ABC_QTD.values()), 'quantidade': tot_q}
J['compras']['abc_origem'] = N
J['compras']['vendas_90_dias_por_mes'] = {'24 a 31/07': 3860000 / 100, 'agosto': 140000.0, 'setembro': 148900.0, 'outubro (até 21/10)': r(real_mes), 'origem': N}

# produtos: encalhe (38)
FORN = {'FN': 'Ferragens Norte', 'MV': 'Madeiras do Vale', 'PC': 'Parafusos & Cia', 'CM': 'Casa do Marceneiro Atacado',
        'BC': 'Bordas & Colas Nordeste', 'LP': 'Luz e Perfil Distribuidora'}
ENC = [  # código, descrição, grupo, marca, fornecedor, estoque, custo(c), última venda, compra nos 90 dias (data, NF, un., ERP)
    ('20500', 'Corrediça oculta 500 mm', 'Corrediças', 'Deslizza', 'FN', 34, 5800, '2026-06-27', ('2026-10-02', '48213', 20)),
    ('61820', 'Chapa MDF 18 mm nogueira rústica', 'Chapas de MDF', 'Chapa Norte', 'MV', 6, 28900, '2026-07-03', ('2026-08-12', '1102', 6)),
    ('70412', 'Perfil LED de sobrepor 3 m', 'Iluminação LED', 'Luzmóvel', 'LP', 28, 6450, '2026-05-18', None),
    ('50233', 'Lixeira de embutir 2 cestos 30 L', 'Acessórios de cozinha', 'Cozimax', 'CM', 7, 18900, '2026-06-11', None),
    ('30960', 'Puxador perfil gola 3 m preto', 'Puxadores', 'Puxare', 'CM', 12, 9800, '2026-07-22', None),
    ('50118', 'Porta-talheres 60 cm cinza', 'Acessórios de cozinha', 'Cozimax', 'CM', 15, 7200, '2026-05-29', None),
    ('70225', 'Fita LED 5 m 12 V branca fria', 'Iluminação LED', 'Luzmóvel', 'LP', 30, 3490, '2026-07-14', ('2026-09-16', '2188', 30)),
    ('80340', 'Serra copo 35 mm', 'Ferramentas e abrasivos', 'Marcenex', 'FN', 18, 5200, '2026-06-09', None),
    ('50390', 'Cesto aramado de canto 4 em 1', 'Acessórios de cozinha', 'Cozimax', 'CM', 4, 22800, '2026-04-30', None),
    ('30455', 'Puxador concha 96 mm inox', 'Puxadores', 'Puxare', 'CM', 68, 1350, '2026-06-20', None),
    ('70610', 'Spot LED de embutir 3 W', 'Iluminação LED', 'Luzmóvel', 'LP', 40, 1980, '2026-07-05', None),
    ('10520', 'Dobradiça para vidro 4 mm', 'Dobradiças', 'Ferrolar', 'FN', 48, 1590, '2026-05-17', None),
    ('50277', 'Suporte regulável para micro-ondas', 'Acessórios de cozinha', 'Cozimax', 'CM', 9, 7900, '2026-06-26', None),
    ('30188', 'Puxador botão de cerâmica branco', 'Puxadores', 'Puxare', 'CM', 85, 790, '2026-05-08', None),
    ('90115', 'Cola de contato 2,8 kg', 'Colas e adesivos', 'Colaforte', 'BC', 6, 10400, '2026-07-15', ('2026-09-29', '9971', 6)),
    ('70733', 'Driver LED 60 W 12 V', 'Iluminação LED', 'Luzmóvel', 'LP', 11, 5400, '2026-06-10', None),
    ('80412', 'Jogo de brocas para madeira, 5 peças', 'Ferramentas e abrasivos', 'Marcenex', 'FN', 14, 3990, '2026-05-21', None),
    ('40720', 'Fita de borda 22 mm carvalho, 20 m', 'Fitas de borda', 'Bordacor', 'BC', 26, 2100, '2026-07-02', None),
    ('30612', 'Puxador alça 320 mm dourado', 'Puxadores', 'Puxare', 'CM', 21, 2490, '2026-06-12', None),
    ('50455', 'Escorredor de pratos para armário 80 cm', 'Acessórios de cozinha', 'Cozimax', 'CM', 6, 8400, '2026-05-19', None),
    ('20350', 'Corrediça telescópica 350 mm preta', 'Corrediças', 'Deslizza', 'FN', 22, 2150, '2026-07-04', None),
    ('70548', 'Sensor de presença para LED', 'Iluminação LED', 'Luzmóvel', 'LP', 16, 2850, '2026-05-27', None),
    ('30744', 'Puxador cava 1,5 m alumínio', 'Puxadores', 'Puxare', 'CM', 9, 4700, '2026-07-01', None),
    ('80266', 'Disco de lixa 125 mm grão 120, caixa com 50', 'Ferramentas e abrasivos', 'Marcenex', 'FN', 11, 3600, '2026-06-23', None),
    ('90330', 'Silicone acético transparente 280 g', 'Colas e adesivos', 'Colaforte', 'BC', 40, 920, '2026-07-06', None),
    ('50612', 'Cabideiro retrátil para armário', 'Acessórios de cozinha', 'Cozimax', 'CM', 5, 6900, '2026-06-16', None),
    ('70318', 'Luminária LED sobre bancada 60 cm', 'Iluminação LED', 'Luzmóvel', 'LP', 8, 4100, '2026-06-24', None),
    ('30833', 'Puxador ponto 32 mm preto', 'Puxadores', 'Puxare', 'CM', 52, 610, '2026-05-13', None),
    ('10612', 'Dobradiça de canto 165°', 'Dobradiças', 'Ferrolar', 'FN', 14, 2190, '2026-07-07', None),
    ('80551', 'Formão 3/4" cabo plástico', 'Ferramentas e abrasivos', 'Marcenex', 'FN', 10, 2840, '2026-05-12', None),
    ('40855', 'Fita de borda 45 mm branco TX, 50 m', 'Fitas de borda', 'Bordacor', 'BC', 6, 4600, '2026-06-25', None),
    ('30290', 'Puxador de embutir redondo 35 mm latão', 'Puxadores', 'Puxare', 'CM', 38, 690, '2026-07-09', None),
    ('50780', 'Pé regulável para armário 100 mm, jogo com 4', 'Acessórios de cozinha', 'Cozimax', 'CM', 12, 1990, '2026-06-29', None),
    ('70815', 'Fonte LED 12 V 2 A', 'Iluminação LED', 'Luzmóvel', 'LP', 14, 1640, '2026-07-08', None),
    ('90512', 'Cola instantânea gel 100 g', 'Colas e adesivos', 'Colaforte', 'BC', 18, 1190, '2026-06-30', ('2026-10-09', '9990', 12)),
    ('60570', 'Parafuso cabeça chata 5 × 70 mm, caixa com 500', 'Parafusos e fixação', 'Fixamais', 'PC', 7, 2750, '2026-06-14', None),
    ('80714', 'Grosa meia-cana 8"', 'Ferramentas e abrasivos', 'Marcenex', 'FN', 7, 2400, '2026-06-18', None),
    ('30915', 'Puxador concha 64 mm níquel', 'Puxadores', 'Puxare', 'CM', 26, 580, '2026-06-03', None),
]
INI = D(2026, 9, 26)  # estoque conhecido desde


def estoque_medio(estoque_hoje, compra):
    """média do estoque no fim de cada dia, de 26/09 a 21/10 (26 dias)"""
    if not compra:
        return float(estoque_hoje)
    dc = D.fromisoformat(compra[0])
    if dc < INI:
        return float(estoque_hoje)
    antes = estoque_hoje - compra[2]
    tot = sum(antes if d < dc else estoque_hoje for d in dias(INI, HOJE))
    return round(tot / 26, 1)


enc = []
for cod, desc, grupo, marca, f, est, custo, ult, compra in ENC:
    item = {'codigo': cod, 'descricao': desc, 'grupo': grupo, 'marca': marca, 'fornecedor': FORN[f],
            'classe_valor': 'sem venda', 'classe_quantidade': 'sem venda', 'liquido_90': 0.0, 'quantidade_90': 0,
            'estoque': est, 'estoque_medio': estoque_medio(est, compra), 'giro': 0.0, 'cobertura_dias': None,
            'custo': r(custo), 'valor_parado': r(est * custo), 'ultima_venda': ult, 'marcas': ['encalhe']}
    if compra:
        dc = D.fromisoformat(compra[0])
        item['comprado_90'] = {'data': compra[0], 'nf': compra[1], 'unidades': compra[2],
                               'erp': 'novo (com valor)' if dc >= D(2026, 9, 28) else 'anterior (nota sem valor)'}
        if dc >= D(2026, 9, 28):
            item['comprado_90']['valor'] = r(compra[2] * custo)
        item['marcas'].append('comprado em 90 dias')
    enc.append(item)
enc.sort(key=lambda x: -x['valor_parado'])
valor_enc = sum(c(x['valor_parado']) for x in enc)

# novos em carência (8): comprados nos 90 dias, sem venda, fora do encalhe
NOVOS = [
    ('70290', 'Perfil LED de embutir 2 m', 'Iluminação LED', 'Luzmóvel', 'LP', 40, 3800, '2026-09-29', '2209'),
    ('10712', 'Dobradiça slide-on 35 mm curva com amortecedor', 'Dobradiças', 'Ferrolar', 'FN', 200, 980, '2026-10-01', '48166'),
    ('20550', 'Corrediça telescópica 550 mm com amortecedor', 'Corrediças', 'Deslizza', 'FN', 40, 4400, '2026-10-06', '48390'),
    ('30388', 'Puxador alça 160 mm grafite', 'Puxadores', 'Puxare', 'CM', 120, 1120, '2026-10-08', '5612'),
    ('40330', 'Fita de borda 22 mm freijó, 20 m', 'Fitas de borda', 'Bordacor', 'BC', 60, 1950, '2026-09-29', '9971'),
    ('50840', 'Organizador de gaveta ajustável', 'Acessórios de cozinha', 'Cozimax', 'CM', 24, 3600, '2026-10-13', '5640'),
    ('90612', 'Cola PVA extra 1 kg', 'Colas e adesivos', 'Colaforte', 'BC', 48, 1490, '2026-10-15', '10018'),
    ('60455', 'Cavilha de madeira 8 × 40 mm, pacote com 100', 'Parafusos e fixação', 'Fixamais', 'PC', 30, 790, '2026-10-16', '7781'),
]
novos = []
for cod, desc, grupo, marca, f, est, custo, ent, nf in NOVOS:
    de = D.fromisoformat(ent)
    novos.append({'codigo': cod, 'descricao': desc, 'grupo': grupo, 'marca': marca, 'fornecedor': FORN[f],
                  'classe_valor': 'sem venda', 'liquido_90': 0.0, 'quantidade_90': 0, 'estoque': est,
                  'estoque_medio': round(sum(0 if d < de else est for d in dias(INI, HOJE)) / 26, 1),
                  'custo': r(custo), 'valor_em_estoque': r(est * custo), 'primeira_entrada': ent, 'nf': nf,
                  'carencia_ate': iso(de + dt.timedelta(60)), 'ultima_venda': None,
                  'marcas': [f'novo, em carência até {(de + dt.timedelta(60)).strftime("%d/%m")}']})

# ruptura (3, todos curva A) — nomes canônicos
RUP = [
    ('10235', 'Dobradiça 35 mm', 'Dobradiças', 'Ferrolar', 'FN', 1840, 1288000, 520, '2026-10-19'),
    ('20450', 'Corrediça 450 mm', 'Corrediças', 'Deslizza', 'FN', 412, 1112400, 1580, '2026-10-20'),
    ('30128', 'Puxador 128 mm', 'Puxadores', 'Puxare', 'CM', 380, 655500, 990, '2026-10-17'),
]
# estoque por dia da Dobradiça 35 mm (C3, segundo exemplo): 300 na virada, entrada de 200 em 06/10, zera em 19/10
serie_dob = {}
est = 300
venda_dob = {}
for d in dias(INI, HOJE):
    if d == D(2026, 10, 6):
        est += 200
    if util(d) and d != INI and d <= D(2026, 10, 19):
        v = 15 if d.weekday() == 5 else 30
        if d == D(2026, 10, 19):
            v = est
        venda_dob[iso(d)] = v
        est -= v
    serie_dob[iso(d)] = est
assert est == 0 and min(serie_dob.values()) >= 0
med_dob = round(sum(serie_dob.values()) / 26, 1)
# estoque médio das outras duas: zeradas em 20/10 e 17/10, com séries simples
MED_RUP = {'10235': med_dob, '20450': 46.2, '30128': 41.0}
rup = []
for cod, desc, grupo, marca, f, qtd, liq, custo, ult in RUP:
    rup.append({'codigo': cod, 'descricao': desc, 'grupo': grupo, 'marca': marca, 'fornecedor': FORN[f],
                'classe_valor': 'A', 'classe_quantidade': 'A', 'liquido_90': r(liq), 'quantidade_90': qtd,
                'estoque': 0, 'estoque_medio': MED_RUP[cod], 'giro': hq(qtd / MED_RUP[cod], 1), 'cobertura_dias': 0,
                'custo': r(custo), 'valor_parado': None, 'ultima_venda': ult, 'marcas': ['ruptura']})

# maiores em R$ nos 90 dias (visão Todos / Curva ABC por valor, os 12 primeiros)
TOP = [  # código, descrição, grupo, marca, forn, qtd, liquido(c), estoque, estoque médio, última venda
    ('61815', 'Chapa MDF 15 mm branco TX', 'Chapas de MDF', 'Chapa Norte', 'MV', 52, 1034800, 18, 21.5, '2026-10-21'),
    ('40122', 'Fita de borda 22 mm branco TX, 20 m', 'Fitas de borda', 'Bordacor', 'BC', 610, 908900, 240, 255.0, '2026-10-21'),
    ('20400', 'Corrediça telescópica 400 mm', 'Corrediças', 'Deslizza', 'FN', 300, 765000, 96, 104.0, '2026-10-21'),
    ('60415', 'Parafuso chipboard 4 × 40 mm, caixa com 500', 'Parafusos e fixação', 'Fixamais', 'PC', 210, 651000, 95, 102.0, '2026-10-21'),
    ('61818', 'Chapa MDF 18 mm branco TX', 'Chapas de MDF', 'Chapa Norte', 'MV', 28, 641200, 9, 12.4, '2026-10-20'),
    ('90215', 'Cola de contato 750 g', 'Colas e adesivos', 'Colaforte', 'BC', 290, 623500, 110, 118.0, '2026-10-21'),
    ('10226', 'Dobradiça 26 mm reta', 'Dobradiças', 'Ferrolar', 'FN', 860, 593400, 400, 420.0, '2026-10-21'),
    ('20300', 'Corrediça telescópica 300 mm', 'Corrediças', 'Deslizza', 'FN', 250, 550000, 70, 76.0, '2026-10-21'),
    ('50320', 'Lixeira de embutir 15 L', 'Acessórios de cozinha', 'Cozimax', 'CM', 41, 528900, 12, 13.1, '2026-10-19'),
]
top = []
for cod, desc, grupo, marca, f, qtd, liq, est_, med, ult in TOP:
    top.append({'codigo': cod, 'descricao': desc, 'grupo': grupo, 'marca': marca, 'fornecedor': FORN[f],
                'classe_valor': 'A', 'classe_quantidade': 'A' if qtd >= 200 else 'B', 'liquido_90': r(liq), 'quantidade_90': qtd,
                'estoque': est_, 'estoque_medio': med, 'giro': hq(qtd / med, 1), 'cobertura_dias': int(hq(est_ / (qtd / 90), 0)),
                'valor_parado': None, 'ultima_venda': ult, 'marcas': []})
maiores = sorted(rup + top, key=lambda x: -x['liquido_90'])

NEG = [
    {'codigo': '10901', 'descricao': 'Dobradiça piano 1 m latonada', 'grupo': 'Dobradiças', 'marca': 'Ferrolar', 'fornecedor': 'Ferragens Norte',
     'estoque': -3, 'ultima_venda': '2026-07-11', 'classe_valor': 'sem venda', 'marcas': ['estoque negativo'],
     'nota': 'sem venda nos 90 dias; provável erro de contagem no inventário de 26/09'},
    {'codigo': '20990', 'descricao': 'Trilho superior de porta de correr 2 m', 'grupo': 'Corrediças', 'marca': 'Deslizza', 'fornecedor': 'Ferragens Norte',
     'estoque': -2, 'ultima_venda': '2026-06-02', 'classe_valor': 'sem venda', 'marcas': ['estoque negativo'],
     'nota': 'sem venda nos 90 dias; provável erro de contagem no inventário de 26/09'},
]
CZ = [
    ('60520', 'Parafuso chipboard 4 × 50 mm, caixa com 500', 'Parafusos e fixação', 'B', 64, '2026-10-20'),
    ('40118', 'Fita de borda 19 mm branco TX, 20 m', 'Fitas de borda', 'B', 85, '2026-10-21'),
    ('90118', 'Cola branca PVA 500 g', 'Colas e adesivos', 'C', 40, '2026-10-16'),
    ('30512', 'Puxador concha 128 mm preto', 'Puxadores', 'C', 22, '2026-10-08'),
    ('80118', "Lixa d'água grão 220", 'Ferramentas e abrasivos', 'C', 150, '2026-10-14'),
    ('60910', 'Cantoneira metálica 30 mm, pacote com 10', 'Parafusos e fixação', 'C', 18, '2026-10-13'),
    ('99001', 'Corte de chapa (serviço)', 'Sem grupo', 'C', 0, '2026-10-21'),
]
custo_zero = [{'codigo': a, 'descricao': b, 'grupo': g, 'classe_valor': k, 'estoque': e, 'ultima_venda': u, 'custo': 0.0,
               'marcas': ['custo zero']} for a, b, g, k, e, u in CZ]

comprados_sem_venda = [x for x in enc if 'comprado_90' in x] + novos
J['compras']['encalhe'] = {'produtos': len(enc), 'valor': r(valor_enc), 'ha_30_dias': {'produtos': 30, 'valor': 19740.0},
                           'lista': enc, 'origem': {'produtos/valor (mil)': C, 'há 30 dias: produtos': C, 'há 30 dias: valor': N, 'lista': N}}
J['compras']['ruptura'] = {'produtos': 3, 'curva_A': 3, 'ha_30_dias': 1, 'lista': rup,
                           'origem': {'contagem e nomes': C, 'lista com números': N, 'há 30 dias': N}}
J['compras']['comprados_sem_venda'] = {'produtos': len(comprados_sem_venda), 'em_encalhe': len([x for x in enc if 'comprado_90' in x]),
                                       'novos_em_carencia': len(novos), 'ha_30_dias': 10, 'novos': novos,
                                       'origem': {'contagem': C, 'lista e há 30 dias': N}}
J['compras']['estoque_negativo'] = {'produtos': len(NEG), 'ha_30_dias': 4, 'lista': NEG, 'origem': N}
J['compras']['custo_zero'] = {'produtos': len(custo_zero), 'lista': custo_zero, 'origem': N, 'nota': 'cadastro de hoje, sem comparação'}
J['compras']['maiores_90_dias'] = maiores
J['compras']['visoes'] = {'Todos': 760, 'Curva ABC': 712, 'Encalhe': 38, 'Ruptura': 3, 'Comprados nos 90 dias': 150,
                          'Comprados sem venda': 13, 'Estoque negativo': 2, 'Custo zero': 7,
                          'origem': {'Encalhe/Ruptura/Comprados sem venda': C, 'resto': N},
                          'todos_composicao': {'com venda nos 90 dias': 712, 'encalhe': 38, 'novos sem venda': 8, 'estoque negativo sem venda': 2}}

# por grupo (90 dias)
GRUPO_90 = {  # produtos na lista, unidades, R$ (c), estoque hoje, estoque médio
    'Dobradiças': (68, 14200, 8320000, 9800, 10300), 'Corrediças': (54, 6100, 7350000, 4300, 4500),
    'Puxadores': (132, 5400, 5540000, 7900, 7800), 'Parafusos e fixação': (168, 18500, 4620000, 9200, 9700),
    'Fitas de borda': (74, 2900, 4030000, 2100, 2200), 'Chapas de MDF': (36, 1150, 3740000, 380, 410),
    'Colas e adesivos': (41, 1900, 2690000, 2050, 2000), 'Acessórios de cozinha': (63, 640, 2230000, 1160, 1150),
    'Iluminação LED': (58, 820, 1720000, 1680, 1640), 'Ferramentas e abrasivos': (59, 1190, 1510000, 1560, 1540),
    'Sem grupo': (7, 40, 240000, 30, 31)}
por_grupo = []
for g in GRUPOS:
    p, u, v, e, m = GRUPO_90[g]
    le = [x for x in enc if x['grupo'] == g]
    por_grupo.append({'grupo': g, 'produtos': p, 'quantidade_90': u, 'liquido_90': r(v), 'estoque': e, 'estoque_medio': m,
                      'giro': hq(u / m, 2), 'cobertura_dias': int(hq(e / (u / 90), 0)), 'encalhe_produtos': len(le),
                      'valor_parado': r(sum(c(x['valor_parado']) for x in le))})
J['compras']['por_grupo'] = {'grupos': por_grupo, 'origem': N}
J['compras']['onde_esta_parado'] = sorted(por_grupo, key=lambda x: -x['cobertura_dias'])[:5]

# por fornecedor (encalhe tirado da lista; o resto novo)
FORN_90 = {'Ferragens Norte': (212, 21950, 17620000), 'Casa do Marceneiro Atacado': (196, 6040, 7810000),
           'Parafusos & Cia': (171, 18540, 4860000), 'Bordas & Colas Nordeste': (118, 4800, 6720000),
           'Madeiras do Vale': (36, 1150, 3740000), 'Luz e Perfil Distribuidora': (27, 360, 1240000)}
assert sum(v[0] for v in FORN_90.values()) == 760
assert sum(v[1] for v in FORN_90.values()) == tot_q
assert sum(v[2] for v in FORN_90.values()) == tot_v
J['compras']['por_fornecedor'] = {'origem': N, 'fornecedores': [
    {'fornecedor': f, 'produtos': p, 'quantidade_90': u, 'liquido_90': r(v),
     'encalhe_produtos': len([x for x in enc if x['fornecedor'] == f]),
     'valor_parado': r(sum(c(x['valor_parado']) for x in enc if x['fornecedor'] == f))} for f, (p, u, v) in FORN_90.items()]}

# C3: produto principal (encalhe) e dois exemplos
corr = next(x for x in enc if x['codigo'] == '20500')
J['C3'] = {
    'principal': {
        **{k: corr[k] for k in ('codigo', 'descricao', 'grupo', 'marca', 'fornecedor', 'estoque', 'estoque_medio', 'custo', 'valor_parado', 'ultima_venda')},
        'estado': 'Encalhe', 'classe_valor': 'sem venda', 'classe_quantidade': 'sem venda',
        'liquido_90': 0.0, 'quantidade_90': 0, 'giro': 0.0, 'cobertura_dias': None,
        'anteriores_90': {'de': '2026-04-25', 'ate': '2026-07-23', 'quantidade': 7, 'liquido': r(7 * 10490)},
        'preco': 104.90, 'primeira_entrada': '2026-04-14',
        'venda_por_mes': [{'mes': m, 'quantidade': q_, 'liquido': r(q_ * 10490)} for m, q_ in
                          [('abr', 3), ('mai', 5), ('jun', 2), ('jul', 0), ('ago', 0), ('set', 0), ('out', 0)]],
        'estoque_por_dia': [{'data': iso(d), 'estoque': 14 if d < D(2026, 10, 2) else 34} for d in dias(INI, HOJE)],
        'entradas': [
            {'data': '2026-10-02', 'nf': '48213', 'fornecedor': 'Ferragens Norte', 'unidades': 20, 'valor': 1160.00, 'custo_unitario': 58.00},
            {'data': '2026-04-14', 'nf': '3391', 'fornecedor': 'Ferragens Norte', 'unidades': 24, 'valor': None, 'custo_unitario': None,
             'nota': 'esta nota não guardava valor (ERP anterior)'}],
        'historia': 'comprou 24 em 14/04, vendeu 10 até 27/06 e parou; na virada havia 14; comprou mais 20 em 02/10 e não vendeu nenhum',
        'origem': N},
    'ruptura_dobradica_35': {
        **{k: rup[0][k] for k in ('codigo', 'descricao', 'grupo', 'marca', 'fornecedor', 'liquido_90', 'quantidade_90', 'estoque', 'estoque_medio', 'giro', 'custo', 'ultima_venda')},
        'estado': 'Ruptura', 'preco': 7.00, 'primeira_entrada': '2026-04-14',
        'venda_por_mes': [{'mes': m, 'quantidade': q_} for m, q_ in [('abr', 310), ('mai', 590), ('jun', 640), ('jul', 610), ('ago', 600), ('set', 650), ('out', 410)]],
        'venda_90_por_trecho': {'24 a 31/07': 180, 'agosto': 600, 'setembro': 650, 'outubro': 410},
        'estoque_por_dia': [{'data': k, 'estoque': v} for k, v in serie_dob.items()],
        'vendas_desde_virada': venda_dob,
        'entradas': [
            {'data': '2026-10-06', 'nf': '48390', 'fornecedor': 'Ferragens Norte', 'unidades': 200, 'valor': 1040.00, 'custo_unitario': 5.20},
            {'data': '2026-09-05', 'nf': '3874', 'fornecedor': 'Ferragens Norte', 'unidades': 600, 'valor': None, 'nota': 'esta nota não guardava valor (ERP anterior)'},
            {'data': '2026-07-18', 'nf': '3702', 'fornecedor': 'Ferragens Norte', 'unidades': 600, 'valor': None, 'nota': 'esta nota não guardava valor (ERP anterior)'}],
        'origem': {'nome': C, 'resto': N}},
    'novo_em_carencia': {**novos[0], 'estado': 'novo, em carência até 28/11', 'origem': N,
                         'nota': 'não está em encalhe porque a primeira compra (29/09) tem menos de 60 dias'},
}

# ---------------------------------------------------------------- FINANCEIRO
CONTAS = [  # vencimento, fornecedor, descrição, documento, parcela, valor(c), lançada em
    ('2026-10-22', 'Ferragens Norte', 'Compra de ferragens', 'NF 48213', '1 de 1', 648000, '2026-10-02'),
    ('2026-10-23', 'Energia (Equatorial)', 'Conta de luz de setembro', 'boleto 0923-118', '—', 214000, '2026-10-09'),
    ('2026-10-26', 'Madeiras do Vale', 'Compra de chapas de MDF', 'NF 1184', '2 de 4', 990000, '2026-09-25'),
    ('2026-10-27', 'Parafusos & Cia', 'Compra de parafusos', 'NF 7024', '3 de 3', 358000, '2026-08-27'),
    ('2026-10-28', 'Aluguel da loja', 'Aluguel de outubro', 'boleto 1028', '—', 1100000, '2026-10-01'),
    ('2026-10-30', 'Bordas & Colas Nordeste', 'Compra de fitas e colas', 'NF 10044', '1 de 2', 190000, '2026-10-16'),
    ('2026-11-02', 'Casa do Marceneiro Atacado', 'Compra de puxadores', 'NF 5577', '2 de 3', 240000, '2026-09-02'),
    ('2026-11-10', 'Contador', 'Honorários de outubro', 'boleto 1110', '—', 95000, '2026-10-15'),
    ('2026-11-10', 'Internet da loja', 'Fibra de novembro', 'boleto 8812', '—', 25000, '2026-10-15'),
    ('2026-11-16', 'Mensalidade do ERP', 'Novembro', 'boleto 4471', '—', 30000, '2026-10-15'),
    ('2026-11-18', 'Água da loja', 'Conta de outubro', 'boleto 2210', '—', 20000, '2026-10-15'),
    ('2026-11-26', 'Madeiras do Vale', 'Compra de chapas de MDF', 'NF 1184', '3 de 4', 990000, '2026-09-25'),
    ('2026-11-30', 'Bordas & Colas Nordeste', 'Compra de fitas e colas', 'NF 10044', '2 de 2', 190000, '2026-10-16'),
    ('2026-11-30', 'Ferragens Norte', 'Compra de ferragens', 'NF 48877', '1 de 3', 420000, '2026-10-16'),
    ('2026-12-02', 'Casa do Marceneiro Atacado', 'Compra de puxadores', 'NF 5577', '3 de 3', 240000, '2026-09-02'),
    ('2026-12-03', 'Parafusos & Cia', 'Compra de parafusos e cavilhas', 'NF 7781', '1 de 2', 210000, '2026-10-16'),
    ('2026-12-07', 'Luz e Perfil Distribuidora', 'Compra de perfis de LED', 'NF 2209', '1 de 2', 215000, '2026-09-29'),
    ('2026-12-28', 'Madeiras do Vale', 'Compra de chapas de MDF', 'NF 1184', '4 de 4', 990000, '2026-09-25'),
    ('2026-12-30', 'Ferragens Norte', 'Compra de ferragens', 'NF 48877', '2 de 3', 420000, '2026-10-16'),
    ('2027-01-04', 'Parafusos & Cia', 'Compra de parafusos e cavilhas', 'NF 7781', '2 de 2', 210000, '2026-10-16'),
    ('2027-01-06', 'Luz e Perfil Distribuidora', 'Compra de perfis de LED', 'NF 2209', '2 de 2', 215000, '2026-09-29'),
    ('2027-01-29', 'Ferragens Norte', 'Compra de ferragens', 'NF 48877', '3 de 3', 420000, '2026-10-16'),
]
CANON_CONTAS = {'2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27', '2026-10-28'}
PAGAS = [  # venciam de 14 a 21/10 e já foram pagas (explicam a folga de 7 dias atrás)
    ('2026-10-14', 'Ferragens Norte', 'NF 47530', '2 de 2', 786000),
    ('2026-10-15', 'Madeiras do Vale', 'NF 1187', '1 de 1', 418000),
    ('2026-10-16', 'Luz e Perfil Distribuidora', 'NF 2161', '1 de 1', 315000),
    ('2026-10-19', 'Bordas & Colas Nordeste', 'NF 9932', '2 de 2', 247000),
    ('2026-10-19', 'Casa do Marceneiro Atacado', 'NF 5520', '1 de 1', 162000),
    ('2026-10-20', 'Imposto (Simples)', 'DAS de setembro (estimativa)', '—', 684000),
]
SALDO_C = 4130000
contas = []
for v, f, desc, doc, parc, val, lanc in CONTAS:
    contas.append({'vencimento': v, 'fornecedor': f, 'descricao': desc, 'documento': doc, 'parcela': parc, 'valor': r(val),
                   'lancada_em': lanc, 'situacao': 'a vencer', 'origem': C if v in CANON_CONTAS else N})
lim7, lim30 = D(2026, 10, 28), D(2026, 11, 20)
c7 = [x for x in contas if D.fromisoformat(x['vencimento']) <= lim7]
c30 = [x for x in contas if D.fromisoformat(x['vencimento']) <= lim30]
s7 = sum(c(x['valor']) for x in c7)
s30 = sum(c(x['valor']) for x in c30)
stot = sum(c(x['valor']) for x in contas)
# saldo previsto por dia, de 20/10 (data do saldo) a 20/11; o cartão a creditar fica fora da linha
prev = []
s = SALDO_C
for d in dias(D(2026, 10, 20), lim30):
    sai = sum(c(x['valor']) for x in contas if x['vencimento'] == iso(d))
    s -= sai
    prev.append({'data': iso(d), 'saidas': r(sai), 'saldo_previsto': r(s), 'parcelas': len([x for x in contas if x['vencimento'] == iso(d)])})
SALDO_CANON = [("20/10", 41.3), ("21/10", 41.3), ("22/10", 34.8), ("23/10", 32.7), ("24/10", 32.7), ("25/10", 32.7), ("26/10", 22.8),
               ("27/10", 19.2), ("28/10", 8.2), ("29/10", 8.2), ("30/10", 6.3), ("31/10", 6.3), ("01/11", 6.3), ("02/11", 3.9),
               ("03/11", 3.9), ("04/11", 3.9)]
pagas = [{'vencimento': v, 'fornecedor': f, 'documento': doc, 'parcela': p, 'valor': r(val), 'situacao': 'paga'} for v, f, doc, p, val in PAGAS]
s_pagas = sum(c(x['valor']) for x in pagas)
novas_desde_14 = [x for x in contas if x['lancada_em'] > '2026-10-14']
s_novas = sum(c(x['valor']) for x in novas_desde_14)
total_14 = stot - s_novas + s_pagas
parc_14 = len(contas) - len(novas_desde_14) + len(pagas)
saldo_13 = 3762000
conhecidas_14_30 = [x for x in contas if x['lancada_em'] <= '2026-10-14' and D(2026, 10, 22) <= D.fromisoformat(x['vencimento']) <= D(2026, 11, 13)]
folga30_14 = saldo_13 - s_pagas - sum(c(x['valor']) for x in conhecidas_14_30)

J['financeiro'] = {
    'saldo_banco': {'valor': 41300.0, 'data': '2026-10-20', 'digitado_por': 'Israel', 'digitado_em': '21/10 às 07h12', 'idade_dias': 1,
                    'origem': {'valor/data': C, 'quem/quando': N}},
    'contas_a_pagar': {
        'vencidas': {'parcelas': 0, 'valor': 0.0},
        'ate_7_dias': {'parcelas': len(c7), 'valor': r(s7), 'ate': '2026-10-28'},
        'ate_30_dias': {'parcelas': len(c30), 'valor': r(s30), 'ate': '2026-11-20'},
        'total': {'parcelas': len(contas), 'valor': r(stot)},
        'total_ha_7_dias': {'data': '2026-10-14', 'parcelas': parc_14, 'valor': r(total_14)},
        'lista': contas,
        'origem': {'vencidas, até 7 dias e as 5 contas': C, 'até 30 dias (soma)': C, 'resto': N}},
    'folga_7': r(SALDO_C - s7), 'folga_30': r(SALDO_C - s30),
    'folga_7_ha_7_dias': r(saldo_13 - s_pagas), 'folga_30_ha_7_dias': r(folga30_14),
    'historico_14_10': {'saldo_usado': {'data': '2026-10-13', 'valor': r(saldo_13)}, 'pagas_de_14_a_21': pagas,
                        'soma_pagas': r(s_pagas), 'lancadas_depois_de_14': len(novas_desde_14), 'soma_lancadas_depois': r(s_novas),
                        'conhecidas_em_14_que_vencem_de_22_10_a_13_11': r(sum(c(x['valor']) for x in conhecidas_14_30)),
                        'origem': {'folga 7 há 7 dias': C, 'resto': N}},
    'semanas': [{'texto': 'de 22 a 23/10', 'valor': r(sum(c(x['valor']) for x in c7 if x['vencimento'] <= '2026-10-23'))},
                {'texto': 'de 26 a 28/10', 'valor': r(sum(c(x['valor']) for x in c7 if x['vencimento'] >= '2026-10-26'))}],
    'saldo_previsto': prev, 'saldo_previsto_canonico_mil': SALDO_CANON,
    'cartao_a_creditar': {'credito_em': '2026-10-22', 'valor': 910.00, 'origem': N,
                          'nota': 'crédito R$ 540,00 + débito R$ 370,00 vendidos hoje até 14h05; aparece como barra própria e não entra na linha do saldo previsto nem na folga'},
    'fluxo_mes': {'de': '2026-10-01', 'ate': '2026-10-21', 'origem': N,
                  'entradas': {'dinheiro': 6420.0, 'pix': 64730.0, 'credito': 12180.0, 'debito': 8850.0},
                  'saidas': 99240.0,
                  'setembro_mesmo_periodo': {'de': '2026-09-01', 'ate': '2026-09-21', 'entradas': 101350.0, 'saidas': 94870.0},
                  'nota': 'as compras da troca de dono venceram no começo de outubro; card sem clique até a F4 existir'},
    'fonte': 'Posição pelo ERP novo desde 26/09 (até 25/09, pelo ERP anterior)',
    'nota_contas': 'Conta paga e ainda não baixada no ERP continua em aberto e reduz a folga.',
}
J['financeiro']['fluxo_mes']['entradas_total'] = r(sum(c(v) for v in J['financeiro']['fluxo_mes']['entradas'].values()))

# K1 — saldo do banco
HIST = [('2026-10-20', 4130000, '21/10 às 07h12'), ('2026-10-19', 4315000, '20/10 às 07h05'), ('2026-10-16', 4248000, '17/10 às 08h20'),
        ('2026-10-15', 4095000, '16/10 às 07h30'), ('2026-10-13', 3762000, '14/10 às 07h18'), ('2026-10-09', 3948000, '10/10 às 08h02'),
        ('2026-10-08', 4217000, '09/10 às 07h25'), ('2026-10-06', 4590000, '07/10 às 07h40'), ('2026-10-02', 4635000, '03/10 às 08h15'),
        ('2026-10-01', 4800000, '02/10 às 07h10')]
J['K1'] = {
    'linha': 'O ERP não sabe o saldo do banco. Digite o saldo para o Kaizen calcular a folga.',
    'ultimo': {'valor': 41300.0, 'data': '2026-10-20', 'ha_dias': 1, 'quem': 'Israel', 'quando': '21/10 às 07h12'},
    'historico': [{'data': d_, 'valor': r(v), 'quem': 'Israel', 'quando': q_} for d_, v, q_ in HIST],
    'formulario_exemplo': {'data': '2026-10-21', 'valor': 42780.0,
                           'depois_de_salvar': 'Saldo salvo. A folga nova aparece na próxima atualização, às 15h.'},
    'substituir': 'Já existe R$ 41.300,00 em 20/10. Substituir?',
    'apagar': 'Apagar o saldo de 20/10 (R$ 41.300,00)? A folga volta a usar o saldo de 19/10 (R$ 43.150,00).',
    'erros': {'valor': 'Digite um valor em reais, no formato 41.300,00.', 'futuro': 'A data não pode ser depois de hoje (21/10/2026).',
              'antes': 'A data não pode ser antes de 01/04/2026, o primeiro dia do Kaizen.',
              'negativo': 'Saldo negativo: −R$ 1.250,00. Confirmar?'},
    'nenhum': 'Nenhum saldo digitado ainda. A folga só aparece depois do primeiro.',
    'origem': {'último saldo (valor e data)': C, 'resto': N}}

# ---------------------------------------------------------------- CAIXA (F3)
TURNOS = []  # data, abertura, fechamento, quebra por forma (c)
for d in dias(D(2026, 10, 1), D(2026, 10, 20)):
    if not util(d):
        continue
    sab = d.weekday() == 5
    q_ = {'dinheiro': 0, 'pix': 0, 'credito': 0, 'debito': 0}
    if d.day == 2:
        q_['dinheiro'] = -500
    if d.day == 7:
        q_['dinheiro'] = 200
    if d.day == 9:
        q_['debito'] = -3800
    if d.day == 15:
        q_['dinheiro'] = -150
    num_f = 200 + list(dias(D(2026, 10, 1), d)).index(d)
    TURNOS.append({'data': iso(d), 'fechamento_numero': 199 + len(TURNOS) + 1, 'caixa': 'Caixa 1', 'operador': 'gerente',
                   'abertura': '07h0' + str(1 + len(TURNOS) % 5), 'fechamento': ('12h1' if sab else '18h1') + str(len(TURNOS) % 6),
                   'quebra_formas': {k: r(v) for k, v in q_.items()}, 'quebra': r(sum(q_.values())),
                   'estado': 'fora' if abs(sum(q_.values())) > 500 else 'no lugar'})
TURNOS[-1]['abertura'], TURNOS[-1]['fechamento'] = '07h02', '18h14'
soma_q = sum(c(t['quebra']) for t in TURNOS)
por_forma = {k: r(sum(c(t['quebra_formas'][k]) for t in TURNOS)) for k in ('dinheiro', 'pix', 'credito', 'debito')}
J['caixa'] = {
    'dia_20_10': {
        'data': '2026-10-20', 'faixa': 'Você está vendo terça, 20/10/2026 · calculado em 20/10 às 22h04',
        'fechamento': {'numero': TURNOS[-1]['fechamento_numero'], 'caixa': 'Caixa 1', 'operador': 'gerente', 'abertura': '07h02', 'fechamento': '18h14',
                       'formas': [{'forma': 'Dinheiro', 'calculado': 150.0, 'informado': 150.0}, {'forma': 'Pix', 'calculado': 4190.0, 'informado': 4190.0},
                                  {'forma': 'Crédito', 'calculado': 760.0, 'informado': 760.0}, {'forma': 'Débito', 'calculado': 560.0, 'informado': 560.0}]},
        'vendas_por_forma': {'dinheiro': 470.0, 'pix': 4190.0, 'credito': 760.0, 'debito': 560.0},
        'vendido': 5980.0, 'devolucoes': 80.0, 'realizado': 5900.0,
        'gaveta': {'vendas_dinheiro': 470.0, 'suprimentos': 150.0, 'sangrias': 390.0, 'devolucoes_dinheiro': 80.0},
        'movimentos': [{'hora': '07h02', 'tipo': 'Suprimento', 'valor': 150.0, 'operador': 'gerente', 'observacao': 'troco da abertura'},
                       {'hora': '12h20', 'tipo': 'Sangria', 'valor': 200.0, 'operador': 'gerente', 'observacao': 'para o cofre'},
                       {'hora': '17h55', 'tipo': 'Sangria', 'valor': 190.0, 'operador': 'gerente', 'observacao': 'para o cofre, fim do dia'}],
        'frase': 'Bateu nas 4 formas.',
        'origem': {'quebra R$ 0,00 em 20/10': C, 'resto': N}},
    'dia_21_10_ate_14h05': {
        'frase': 'O caixa deste dia ainda não fechou; último fechamento: 20/10.',
        'gaveta': {'vendas_dinheiro': 320.0, 'suprimentos': 150.0, 'sangrias': 200.0, 'devolucoes_dinheiro': 0.0},
        'movimentos': [{'hora': '07h03', 'tipo': 'Suprimento', 'valor': 150.0, 'operador': 'gerente', 'observacao': 'troco da abertura'},
                       {'hora': '12h15', 'tipo': 'Sangria', 'valor': 200.0, 'operador': 'gerente', 'observacao': 'para o cofre'}],
        'origem': N},
    'dia_09_10_fora': {
        'data': '2026-10-09', 'numero': next(t['fechamento_numero'] for t in TURNOS if t['data'] == '2026-10-09'),
        'formas': [{'forma': 'Dinheiro', 'calculado': 150.0, 'informado': 150.0}, {'forma': 'Pix', 'calculado': 4500.0, 'informado': 4500.0},
                   {'forma': 'Crédito', 'calculado': 790.0, 'informado': 790.0}, {'forma': 'Débito', 'calculado': 690.0, 'informado': 652.0}],
        'vendas_por_forma': {'dinheiro': 450.0, 'pix': 4500.0, 'credito': 790.0, 'debito': 690.0}, 'vendido': 6430.0, 'devolucoes': 30.0,
        'gaveta': {'vendas_dinheiro': 450.0, 'suprimentos': 150.0, 'sangrias': 420.0, 'devolucoes_dinheiro': 30.0},
        'origem': N},
    'mes': {'turnos': TURNOS, 'fechamentos': len(TURNOS), 'quebra_total': r(soma_q), 'por_forma': por_forma,
            'media_por_fechamento': hq(soma_q / len(TURNOS) / 100, 2), 'tolerancia': 5.00, 'origem': N},
    'nota': 'O fechamento é às cegas: o informado é a contagem do operador; a linha de troca fica fora.',
}
for k in ('dia_20_10', 'dia_09_10_fora'):
    blk = J['caixa'][k]
    formas = blk['fechamento']['formas'] if k == 'dia_20_10' else blk['formas']
    for f in formas:
        f['quebra'] = r(c(f['informado']) - c(f['calculado']))
    g = blk['gaveta']
    g['gaveta'] = r(c(g['vendas_dinheiro']) + c(g['suprimentos']) - c(g['sangrias']) - c(g['devolucoes_dinheiro']))
g = J['caixa']['dia_21_10_ate_14h05']['gaveta']
g['gaveta'] = r(c(g['vendas_dinheiro']) + c(g['suprimentos']) - c(g['sangrias']) - c(g['devolucoes_dinheiro']))

# ---------------------------------------------------------------- METAS E FERIADOS (K2)
J['metas'] = {
    'meses_da_lista': [f'{m}/{a}' for a, m in [(2026, m) for m in range(4, 13)] + [(2027, m) for m in range(1, 11)]],
    'outubro': {'loja': 150000.0, 'Igor': 75000.0, 'Daniele': 75000.0, 'dias_uteis': 26, 'fechados': ['2026-10-12'], 'origem': C},
    'setembro': {'loja': 150000.0, 'Igor': 75000.0, 'Daniele': 75000.0, 'dias_uteis': 24, 'fechados': ['2026-09-07', '2026-09-26'],
                 'origem': {'loja e dias': C, 'vendedores': N}},
    'novembro': {'loja': 145000.0, 'Igor': 72500.0, 'Daniele': 72500.0, 'dias_uteis': len(nov_uteis), 'fechados': ['2026-11-02'], 'origem': N,
                 'nota': 'digitadas pelo dono em 20/10; menores que as de outubro porque novembro tem 24 dias úteis, e não 26'},
    'dezembro': {'loja': None, 'Igor': None, 'Daniele': None, 'dias_uteis': len(uteis_mes(2026, 12)), 'fechados': ['2026-12-25'], 'origem': N,
                 'estado': 'Sem meta, o ritmo fica vazio.'},
    'abril_a_agosto': 'sem meta cadastrada',
    'ajuste_igor_exemplo': {'mes': 'outubro de 2026', 'de': 75000.0, 'para': 60000.0, 'origem': C,
                            'efeito': 'O ritmo do Igor passa a ser medido contra R$ 60 mil, em vez de R$ 75 mil.',
                            'confirmacao': 'A meta de outubro do Igor muda de R$ 75.000,00 para R$ 60.000,00. Confirmar?',
                            'conferencia_depois': {'soma_vendedores': 135000.0, 'loja': 150000.0, 'diferenca': 15000.0, 'origem': N}},
}

J['mapa_telas'] = {
    'G1': ['base.pessoa'], 'I1': ['vendas.mes', 'vendas.dia', 'vendas.vendedores', 'vendas.outros', 'vendas.exemplo_15_09', 'compras.comprados', 'compras.encalhe', 'compras.ruptura', 'financeiro', 'caixa.dia_20_10'],
    'V1': ['vendas.mes', 'vendas.dia', 'vendas.por_dia', 'vendas.por_hora', 'vendas.vendedores', 'vendas.outros', 'vendas.excecao_sem_vendedor_exemplo_de_estado'],
    'V2': ['vendas.vendedores', 'vendas.mix_mes', 'vendas.clientes_atendidos_fase8_daniele'],
    'C1': ['compras.periodo', 'compras.comprados', 'compras.encalhe', 'compras.ruptura', 'compras.comprados_sem_venda', 'compras.estoque_negativo', 'compras.custo_zero', 'compras.abc_valor', 'compras.abc_quantidade', 'compras.onde_esta_parado'],
    'C2': ['compras.visoes', 'compras.encalhe.lista', 'compras.ruptura.lista', 'compras.comprados_sem_venda', 'compras.estoque_negativo', 'compras.custo_zero', 'compras.maiores_90_dias', 'compras.por_grupo', 'compras.por_fornecedor'],
    'C3': ['C3'], 'F1': ['financeiro', 'caixa.dia_20_10', 'caixa.dia_21_10_ate_14h05'], 'F2': ['financeiro.contas_a_pagar', 'financeiro.saldo_previsto', 'financeiro.historico_14_10', 'financeiro.cartao_a_creditar'],
    'K1': ['K1'], 'F3': ['caixa'], 'K2': ['metas', 'vendas.meses_anteriores']}

(AQUI / 'dados-exemplo.json').write_text(json.dumps(J, ensure_ascii=False, indent=1))
print('ok: dados-exemplo.json', 'encalhe', len(enc), r(valor_enc), 'projeção', r(proj_c), 'até 30', r(s30), 'total', r(stot), len(contas))
print('folga30 há 7 dias', r(folga30_14), 'total 14/10', r(total_14), parc_14, 'quebra mês', r(soma_q), len(TURNOS))
print('estoque médio dobradiça', med_dob, 'giro', hq(1840 / med_dob, 1))
print('onde parado', [(x['grupo'], x['cobertura_dias']) for x in J['compras']['onde_esta_parado']])
