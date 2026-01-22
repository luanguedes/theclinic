import pandas as pd
import json
import re

# CONFIGURAÇÃO
ARQUIVO_ENTRADA = 'tuss_tabela_22.csv' # Ou .xlsx dependendo do que você baixar
ARQUIVO_SAIDA = 'exames_limpos.json'

def processar_tuss():
    print(f"--- Lendo tabela TUSS: {ARQUIVO_ENTRADA} ---")
    
    # Dica: A tabela TUSS costuma vir com cabeçalho simples. 
    # Às vezes o CSV usa ';' como separador e encoding 'latin1' ou 'utf-8-sig'.
    try:
        df = pd.read_csv(ARQUIVO_ENTRADA, encoding='latin1', sep=';', dtype=str)
    except:
        # Tenta ler como Excel se o CSV falhar
        df = pd.read_excel(ARQUIVO_ENTRADA, dtype=str)

    # Padronizar nomes de colunas (as vezes vem como "Código do Termo", "Termo", etc)
    # Vamos renomear para garantir
    # Ajuste os índices (0, 1, etc) conforme seu arquivo se os nomes mudarem
    colunas_map = {
        df.columns[0]: 'codigo',         # Geralmente a 1ª coluna
        df.columns[1]: 'procedimento',   # Geralmente a 2ª coluna
        # Procure colunas de data se existirem para filtrar vigência
    }
    df = df.rename(columns=colunas_map)
    
    # Se tiver coluna de "Data Fim de Vigência", vamos filtrar o que já venceu
    colunas_dt_fim = [c for c in df.columns if 'fim' in c.lower() and 'vig' in c.lower()]
    if colunas_dt_fim:
        col_fim = colunas_dt_fim[0]
        print(f"Filtrando por vigência usando coluna: {col_fim}")
        # Mantém apenas onde a data fim é vazia (ainda vigente)
        df = df[df[col_fim].isna() | (df[col_fim] == '')]

    print("Filtrando Grupos (Exames, Consultas, Procedimentos)...")
    
    # 1. Limpar código (remover pontos se houver) -> "4.03.04.36-1" vira "40304361"
    df['codigo_limpo'] = df['codigo'].str.replace(r'[^\d]', '', regex=True)
    
    # 2. A Lógica do Primeiro Dígito
    # Mantém apenas grupos 1, 2, 3 e 4
    # Grupo 3 (Cirurgias) é opcional, mas dermatologistas usam (biópsias, etc).
    grupos_aceitos = ('1', '2', '3', '4') 
    df = df[df['codigo_limpo'].str.startswith(grupos_aceitos, na=False)]

    print("Formatando textos...")
    
    # 3. Formatação Visual (Title Case)
    df['procedimento_formatado'] = df['procedimento'].str.title().str.strip()

    # 4. Remover duplicatas
    df = df.drop_duplicates(subset=['codigo_limpo'])

    # 5. Selecionar colunas finais
    lista_final = []
    for _, row in df.iterrows():
        # Define o "Tipo" baseado no grupo para ajudar na UI (Ícones diferentes?)
        grupo = row['codigo_limpo'][0]
        tipo = 'Outros'
        if grupo == '1': tipo = 'Consulta'
        elif grupo == '2': tipo = 'Procedimento Clínico'
        elif grupo == '3': tipo = 'Cirurgia/Intervenção'
        elif grupo == '4': tipo = 'Exame'

        lista_final.append({
            'codigo_tuss': row['codigo_limpo'],
            'nome': row['procedimento_formatado'],
            'tipo': tipo,
            # Campo de busca combinado (Código + Nome) para o médico achar digitando o código tb
            'search_text': f"{row['procedimento_formatado']} ({row['codigo_limpo']})"
        })

    print(f"Total de procedimentos importados: {len(lista_final)}")
    
    with open(ARQUIVO_SAIDA, 'w', encoding='utf-8') as f:
        json.dump(lista_final, f, ensure_ascii=False, indent=2)
    
    print(f"Arquivo '{ARQUIVO_SAIDA}' gerado com sucesso!")

if __name__ == "__main__":
    processar_tuss()