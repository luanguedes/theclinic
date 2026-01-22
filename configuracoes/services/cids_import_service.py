import pandas as pd
from django.db import transaction

from configuracoes.models import Cid


def formatar_codigo_cid(codigo):
    codigo = str(codigo or '').strip().upper()
    if len(codigo) == 4 and '.' not in codigo:
        return f"{codigo[:3]}.{codigo[3]}"
    return codigo


def _ler_arquivo(arquivo):
    arquivo.seek(0)
    try:
        return pd.read_csv(arquivo, sep=';', encoding='latin1', dtype=str)
    except Exception:
        arquivo.seek(0)
        try:
            return pd.read_csv(arquivo, sep=',', encoding='utf-8', dtype=str)
        except Exception:
            arquivo.seek(0)
            return pd.read_excel(arquivo, dtype=str)


def importar_cids(arquivo):
    df = _ler_arquivo(arquivo)
    if df.empty:
        raise ValueError('Arquivo de CIDs vazio.')

    df.columns = ['codigo_bruto', 'descricao'] + list(df.columns[2:])
    df = df[['codigo_bruto', 'descricao']].dropna()

    total_processados = 0
    criados = 0
    atualizados = 0

    with transaction.atomic():
        for _, row in df.iterrows():
            codigo_puro = str(row['codigo_bruto']).strip().upper()
            if not codigo_puro:
                continue
            codigo_formatado = formatar_codigo_cid(codigo_puro)
            nome = str(row['descricao']).strip().capitalize()
            if not nome:
                continue

            search_text = f"{codigo_formatado} {codigo_puro} {nome}"

            _, created = Cid.objects.update_or_create(
                codigo=codigo_formatado,
                defaults={
                    'nome': nome,
                    'search_text': search_text,
                    'situacao': True
                }
            )
            total_processados += 1
            if created:
                criados += 1
            else:
                atualizados += 1

    return {
        'total_processados': total_processados,
        'criados': criados,
        'atualizados': atualizados
    }
