import io

import pandas as pd


def _read_csv_safe(buffer, **kwargs):
    try:
        return pd.read_csv(buffer, **kwargs)
    except TypeError:
        kwargs.pop('encoding_errors', None)
        return pd.read_csv(buffer, **kwargs)


def _ler_csv_flexivel(arquivo):
    encodings = ['utf-8-sig', 'utf-8', 'cp1252', 'latin1']
    separadores = [';', ',', '\t']

    dados = arquivo.read()
    if not dados:
        return None

    for enc in encodings:
        for sep in separadores:
            try:
                df_test = _read_csv_safe(
                    io.BytesIO(dados),
                    sep=sep,
                    encoding=enc,
                    nrows=5,
                    dtype=str,
                    keep_default_na=False,
                    encoding_errors='strict'
                )
                if len(df_test.columns) >= 2:
                    return _read_csv_safe(
                        io.BytesIO(dados),
                        sep=sep,
                        encoding=enc,
                        dtype=str,
                        keep_default_na=False,
                        encoding_errors='strict'
                    )
            except Exception:
                continue
        try:
            df_test = _read_csv_safe(
                io.BytesIO(dados),
                sep=None,
                engine='python',
                encoding=enc,
                nrows=5,
                dtype=str,
                keep_default_na=False,
                encoding_errors='strict'
            )
            if len(df_test.columns) >= 2:
                return _read_csv_safe(
                    io.BytesIO(dados),
                    sep=None,
                    engine='python',
                    encoding=enc,
                    dtype=str,
                    keep_default_na=False,
                    encoding_errors='strict'
                )
        except Exception:
            continue
    return None


def processar_cbo(arquivo):
    df = _ler_csv_flexivel(arquivo)
    if df is None or df.empty or len(df.columns) < 2:
        return []

    col_codigo = df.columns[0]
    col_nome = df.columns[1]

    lista_final = []
    for _, row in df.iterrows():
        cod_original = str(row[col_codigo]).strip()
        nome = str(row[col_nome]).strip()

        if not cod_original:
            continue

        cod_limpo = cod_original.replace('-', '').replace('.', '').strip()
        nome_formatado = nome

        lista_final.append({
            'codigo': cod_limpo,
            'codigo_visual': cod_original,
            'nome': nome_formatado,
            'search_text': f"{cod_original} {nome_formatado}"
        })

    return lista_final
