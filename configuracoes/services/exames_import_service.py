import re

import pandas as pd

from configuracoes.models import Exame


def _read_tuss_file(arquivo):
    arquivo.seek(0)
    try:
        return pd.read_csv(arquivo, encoding='latin1', sep=';', dtype=str)
    except Exception:
        arquivo.seek(0)
        return pd.read_excel(arquivo, dtype=str)


def _normalize_codigo(valor):
    texto = str(valor or '')
    return re.sub(r'[^\d]', '', texto)


def _mapear_tipo(codigo_limpo):
    if not codigo_limpo:
        return 'Outros'
    grupo = codigo_limpo[0]
    if grupo == '1':
        return 'Consulta'
    if grupo == '2':
        return 'Procedimento Clinico'
    if grupo == '3':
        return 'Cirurgia/Intervencao'
    if grupo == '4':
        return 'Exame'
    return 'Outros'


def importar_exames(arquivo):
    df = _read_tuss_file(arquivo)
    if df.empty:
        raise ValueError('Arquivo de exames vazio.')

    colunas_map = {
        df.columns[0]: 'codigo',
        df.columns[1]: 'procedimento',
    }
    df = df.rename(columns=colunas_map)

    colunas_dt_fim = [c for c in df.columns if 'fim' in str(c).lower() and 'vig' in str(c).lower()]
    if colunas_dt_fim:
        col_fim = colunas_dt_fim[0]
        df = df[df[col_fim].isna() | (df[col_fim] == '')]

    df['codigo_limpo'] = df['codigo'].apply(_normalize_codigo)
    grupos_aceitos = ('1', '2', '3', '4')
    df = df[df['codigo_limpo'].str.startswith(grupos_aceitos, na=False)]

    df['procedimento_formatado'] = df['procedimento'].astype(str).str.title().str.strip()
    df = df.drop_duplicates(subset=['codigo_limpo'])

    registros = []
    for _, row in df.iterrows():
        codigo_limpo = row['codigo_limpo']
        nome = row['procedimento_formatado']
        tipo = _mapear_tipo(codigo_limpo)
        registros.append({
            'codigo_tuss': codigo_limpo,
            'nome': nome,
            'tipo': tipo,
            'search_text': f"{nome} ({codigo_limpo})"
        })

    codigos = [r['codigo_tuss'] for r in registros if r.get('codigo_tuss')]
    existentes = set(Exame.objects.filter(codigo_tuss__in=codigos).values_list('codigo_tuss', flat=True))

    objs = []
    ignorados = 0
    for item in registros:
        codigo_tuss = item.get('codigo_tuss')
        if not codigo_tuss or codigo_tuss in existentes:
            ignorados += 1
            continue
        objs.append(Exame(
            codigo_tuss=codigo_tuss,
            nome=item.get('nome') or '',
            tipo=item.get('tipo') or 'Exame',
            search_text=item.get('search_text') or '',
            situacao=True
        ))

    criados = 0
    if objs:
        for i in range(0, len(objs), 5000):
            lote = objs[i:i + 5000]
            Exame.objects.bulk_create(lote)
            criados += len(lote)

    return {
        'total_processados': len(registros),
        'criados': criados,
        'ignorados': ignorados
    }
