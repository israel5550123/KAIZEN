# Formatos em português do Brasil, iguais aos do Design System do Kaizen.
from decimal import Decimal, ROUND_HALF_UP
import datetime as dt

DIAS_CURTO = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
DIAS_LONGO = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
         'setembro', 'outubro', 'novembro', 'dezembro']
MENOS = '−'  # o sinal de menos verdadeiro


def q(x, casas):
    return Decimal(str(x)).quantize(Decimal(1).scaleb(-casas), rounding=ROUND_HALF_UP)


def _milhar(inteiro):
    s = f'{inteiro:,}'.replace(',', '.')
    return s


def brl(v, sinal=False):
    """R$ 1.234,56 (detalhe). sinal=True põe + nos positivos."""
    d = q(v, 2)
    neg = d < 0
    d = abs(d)
    inteiro = int(d)
    cent = int((d - inteiro) * 100)
    s = f'R$ {_milhar(inteiro)},{cent:02d}'
    if neg:
        return MENOS + s
    if sinal and d > 0:
        return '+' + s
    return s


def mil(v, sinal=False):
    """R$ 92,4 mil (painel), uma casa."""
    d = q(Decimal(str(v)) / 1000, 1)
    neg = d < 0
    d = abs(d)
    s = f'R$ {str(d).replace(".", ",")} mil'
    if s.endswith(',0 mil') and False:
        pass
    if neg:
        return MENOS + s
    if sinal and d > 0:
        return '+' + s
    return s


def num(v, casas=0, sinal=False):
    d = q(v, casas)
    neg = d < 0
    d = abs(d)
    inteiro = int(d)
    if casas:
        frac = str(d).split('.')[1]
        s = f'{_milhar(inteiro)},{frac}'
    else:
        s = _milhar(inteiro)
    if neg:
        return MENOS + s
    if sinal and d > 0:
        return '+' + s
    return s


def pct(v, sinal=False):
    """61,6% — v já em percentual (61.6)."""
    return num(v, 1, sinal) + '%'


def ritmo(v, sinal=False):
    return num(v, 2, sinal)


def data(iso, ano=False):
    d = dt.date.fromisoformat(iso)
    return d.strftime('%d/%m/%Y') if ano else d.strftime('%d/%m')


def data_sem(iso, ano=False, longo=False):
    d = dt.date.fromisoformat(iso)
    nome = (DIAS_LONGO if longo else DIAS_CURTO)[d.weekday()]
    return f'{nome}, {data(iso, ano)}'


def dia_semana(iso, longo=False):
    d = dt.date.fromisoformat(iso)
    return (DIAS_LONGO if longo else DIAS_CURTO)[d.weekday()]


def mes_ano(ano, mes):
    return f'{MESES[mes - 1]} de {ano}'
