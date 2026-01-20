import re
import unicodedata

import pandas as pd

from .models import Medicamento


def _normalize_header(value):
    if not isinstance(value, str):
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    normalized = normalized.upper()
    normalized = re.sub(r"[^A-Z0-9]", "", normalized)
    return normalized


def _find_header_row(df):
    for idx, row in df.iterrows():
        for cell in row.tolist():
            if _normalize_header(cell) == "SUBSTANCIA":
                return idx
    return None


def _read_csv(file_obj):
    encodings = ["utf-8", "latin1"]
    last_error = None
    for encoding in encodings:
        try:
            file_obj.seek(0)
            df_temp = pd.read_csv(file_obj, header=None, nrows=100, encoding=encoding, sep=None, engine="python")
            header_row = _find_header_row(df_temp)
            if header_row is None:
                raise ValueError("Cabecalho nao encontrado no CSV.")
            file_obj.seek(0)
            df = pd.read_csv(
                file_obj,
                header=header_row,
                encoding=encoding,
                sep=None,
                engine="python",
                low_memory=False,
            )
            return df
        except (UnicodeDecodeError, ValueError) as exc:
            last_error = exc
            continue
    raise ValueError(f"Nao foi possivel ler o CSV: {last_error}")


def _read_excel(file_obj):
    file_obj.seek(0)
    df_temp = pd.read_excel(file_obj, header=None, nrows=100)
    header_row = _find_header_row(df_temp)
    if header_row is None:
        raise ValueError("Cabecalho nao encontrado no XLSX.")
    file_obj.seek(0)
    return pd.read_excel(file_obj, header=header_row)


def limpar_apresentacao(texto):
    if not isinstance(texto, str):
        return ""

    padrao_corte = r"\b(CT|CX|FR|EST|BL|ENV|AMP|FA|BS)\b"
    partes = re.split(padrao_corte, texto, maxsplit=1)
    texto_limpo = partes[0].strip()

    substituicoes = {
        "COM REV": "Comprimido Revestido",
        "COM": "Comprimido",
        "CAP GEL DURA": "Capsula",
        "CAP": "Capsula",
        "DRG": "Dragea",
        "XPE": "Xarope",
        "SOL": "Solucao",
        "SUS": "Suspensao",
        "INJ": "Injetavel",
        "CREM": "Creme",
        "POM": "Pomada",
        "GEL": "Gel",
        "TOP": "Topico",
        "OFT": "Oftalmico",
        "NAS": "Nasal",
        "OR": "Oral",
        "RET": "Retal",
        "VAG": "Vaginal",
    }

    for sigla, completo in substituicoes.items():
        texto_limpo = re.sub(r"\b" + sigla + r"\b", completo, texto_limpo)

    return texto_limpo.title()


def _carregar_dataframe(arquivo, extensao):
    if extensao == ".csv":
        return _read_csv(arquivo)
    if extensao in [".xlsx", ".xls"]:
        return _read_excel(arquivo)
    raise ValueError("Formato de arquivo nao suportado.")


def _mapear_colunas(df):
    colunas_map = {
        "PRODUTO": "nome_comercial",
        "SUBSTANCIA": "principio_ativo",
        "APRESENTACAO": "apresentacao_original",
        "LABORATORIO": "laboratorio",
        "TARJA": "tarja",
    }

    colunas_encontradas = {}
    for coluna in df.columns:
        normalizada = _normalize_header(coluna)
        if normalizada in colunas_map:
            colunas_encontradas[coluna] = colunas_map[normalizada]

    df = df.rename(columns=colunas_encontradas)
    return df


def importar_medicamentos(arquivo):
    nome = getattr(arquivo, "name", "") or ""
    extensao = f".{nome.split('.')[-1].lower()}" if "." in nome else ""

    df = _carregar_dataframe(arquivo, extensao)
    df = _mapear_colunas(df)

    campos_necessarios = ["nome_comercial", "principio_ativo"]
    for campo in campos_necessarios:
        if campo not in df.columns:
            raise ValueError(f"Coluna obrigatoria nao encontrada: {campo}")

    df["apresentacao_original"] = df.get("apresentacao_original", "")
    df["laboratorio"] = df.get("laboratorio", "")
    df["tarja"] = df.get("tarja", "")

    df = df.dropna(subset=["nome_comercial", "principio_ativo"])

    df["apresentacao_limpa"] = df["apresentacao_original"].apply(limpar_apresentacao)
    df["search_text"] = (
        df["nome_comercial"].astype(str).str.title().str.strip()
        + " "
        + df["apresentacao_limpa"].astype(str).str.strip()
        + " ("
        + df["principio_ativo"].astype(str).str.title().str.strip()
        + ")"
    )

    df_final = df.drop_duplicates(subset=["search_text", "laboratorio"])
    registros = df_final.to_dict("records")

    search_texts = [str(item.get("search_text") or "").strip() for item in registros if item.get("search_text")]
    existentes = set(
        Medicamento.objects.filter(nome_busca__in=search_texts)
        .values_list("nome_busca", "laboratorio")
    )

    objs = []
    ignorados = 0
    for item in registros:
        nome_comercial = str(item.get("nome_comercial") or "").strip().title()
        if not nome_comercial:
            continue
        principio_ativo = str(item.get("principio_ativo") or "").strip().title()
        apresentacao = str(item.get("apresentacao_limpa") or "").strip()
        laboratorio = str(item.get("laboratorio") or "").strip().title()
        tarja = str(item.get("tarja") or "").strip() or "Venda Livre"
        nome_busca = str(item.get("search_text") or "").strip()

        if (nome_busca, laboratorio) in existentes:
            ignorados += 1
            continue

        objs.append(
            Medicamento(
                nome=nome_comercial,
                principio_ativo=principio_ativo,
                apresentacao=apresentacao,
                laboratorio=laboratorio,
                tarja=tarja,
                nome_busca=nome_busca,
                situacao=True,
            )
        )

    criados = 0
    if objs:
        for i in range(0, len(objs), 5000):
            lote = objs[i : i + 5000]
            Medicamento.objects.bulk_create(lote)
            criados += len(lote)

    return {
        "total_processados": len(registros),
        "criados": criados,
        "ignorados": ignorados,
    }
