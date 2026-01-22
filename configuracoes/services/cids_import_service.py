import os
import tempfile
import zipfile

import pandas as pd
from django.db import transaction

from configuracoes.models import Cid


def formatar_codigo_cid(codigo):
    codigo = str(codigo or '').strip().upper()
    if len(codigo) == 4 and '.' not in codigo:
        return f"{codigo[:3]}.{codigo[3]}"
    return codigo


def _ler_csv_flexivel(caminho_arquivo):
    encodings = ['latin1', 'utf-8', 'cp1252']
    separadores = [';', ',']

    for enc in encodings:
        for sep in separadores:
            try:
                df_test = pd.read_csv(
                    caminho_arquivo,
                    sep=sep,
                    encoding=enc,
                    nrows=5,
                    dtype=str
                )
                if len(df_test.columns) >= 2:
                    return pd.read_csv(
                        caminho_arquivo,
                        sep=sep,
                        encoding=enc,
                        dtype=str
                    )
            except Exception:
                continue
    return None


def _processar_dataframe(df):
    if df is None or df.empty:
        return []

    col_codigo = df.columns[0]
    col_nome = max(df.columns, key=lambda x: df[x].astype(str).str.len().mean())

    registros = []
    for _, row in df.iterrows():
        codigo_bruto = str(row[col_codigo]).strip()
        nome = str(row[col_nome]).strip()
        if not codigo_bruto or codigo_bruto.lower() == 'nan':
            continue

        codigo_formatado = formatar_codigo_cid(codigo_bruto)
        registros.append({
            'codigo': codigo_formatado,
            'codigo_puro': codigo_bruto,
            'nome': nome.upper(),
            'search_text': f"{codigo_formatado} {codigo_bruto} {nome}"
        })

    return registros


def _processar_arquivo_unico(caminho_arquivo):
    df = _ler_csv_flexivel(caminho_arquivo)
    if df is None:
        return []
    return _processar_dataframe(df)


def _processar_zip(caminho_zip):
    registros = []
    with tempfile.TemporaryDirectory() as tmpdirname:
        with zipfile.ZipFile(caminho_zip, 'r') as z:
            z.extractall(tmpdirname)

        arquivos = []
        for raiz, _, nomes in os.walk(tmpdirname):
            for nome in nomes:
                if nome.lower().endswith(('.csv', '.txt')):
                    arquivos.append(os.path.join(raiz, nome))

        if not arquivos:
            return []

        arquivo_vencedor = max(arquivos, key=os.path.getsize)
        registros = _processar_arquivo_unico(arquivo_vencedor)

    return registros


def _carregar_registros(arquivo):
    nome = getattr(arquivo, 'name', '') or ''
    extensao = os.path.splitext(nome)[1].lower()

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        for chunk in arquivo.chunks():
            tmp.write(chunk)
        caminho_tmp = tmp.name

    try:
        if extensao == '.zip':
            registros = _processar_zip(caminho_tmp)
        else:
            registros = _processar_arquivo_unico(caminho_tmp)
    finally:
        try:
            os.remove(caminho_tmp)
        except OSError:
            pass

    return registros


def importar_cids(arquivo):
    registros = _carregar_registros(arquivo)
    if not registros:
        raise ValueError('Arquivo de CIDs vazio ou ilegivel.')

    codigos = [item.get('codigo') for item in registros if item.get('codigo')]
    existentes = {
        cid.codigo: cid
        for cid in Cid.objects.filter(codigo__in=codigos)
    }

    novos = []
    atualizaveis = []
    total_processados = 0

    for item in registros:
        codigo = item.get('codigo')
        nome = item.get('nome')
        search_text = item.get('search_text') or ''
        if not codigo or not nome:
            continue

        total_processados += 1
        existente = existentes.get(codigo)
        if existente:
            existente.nome = nome
            existente.search_text = search_text
            existente.situacao = True
            atualizaveis.append(existente)
        else:
            novos.append(Cid(
                codigo=codigo,
                nome=nome,
                search_text=search_text,
                situacao=True
            ))

    with transaction.atomic():
        if novos:
            for i in range(0, len(novos), 5000):
                Cid.objects.bulk_create(novos[i:i + 5000], ignore_conflicts=True)
        if atualizaveis:
            for i in range(0, len(atualizaveis), 5000):
                Cid.objects.bulk_update(
                    atualizaveis[i:i + 5000],
                    ['nome', 'search_text', 'situacao']
                )

    return {
        'total_processados': total_processados,
        'criados': len(novos),
        'atualizados': len(atualizaveis)
    }
