import pandas as pd


def _ler_csv_flexivel(arquivo):
    encodings = ['latin1', 'utf-8-sig', 'utf-8', 'cp1252']
    separadores = [';', ',', '\t']

    for enc in encodings:
        for sep in separadores:
            try:
                arquivo.seek(0)
                df_test = pd.read_csv(arquivo, sep=sep, encoding=enc, nrows=5, dtype=str)
                if len(df_test.columns) >= 2:
                    arquivo.seek(0)
                    return pd.read_csv(arquivo, sep=sep, encoding=enc, dtype=str)
            except Exception:
                continue
        try:
            arquivo.seek(0)
            df_test = pd.read_csv(arquivo, sep=None, engine='python', encoding=enc, nrows=5, dtype=str)
            if len(df_test.columns) >= 2:
                arquivo.seek(0)
                return pd.read_csv(arquivo, sep=None, engine='python', encoding=enc, dtype=str)
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

        if not cod_original or cod_original.lower() == 'nan':
            continue

        cod_limpo = cod_original.replace('-', '').replace('.', '')
        nome_formatado = nome.title()
        nome_formatado = nome_formatado.replace(' Clinico', ' Clínico')
        nome_formatado = nome_formatado.replace(' Medico', ' Médico')
        nome_formatado = nome_formatado.replace(' Tecnico', ' Técnico')

        lista_final.append({
            'codigo': cod_limpo,
            'codigo_visual': cod_original,
            'nome': nome_formatado,
            'search_text': f"{cod_original} {nome_formatado}"
        })

    return lista_final
