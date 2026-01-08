import os

# --- CONFIGURAÇÕES ---
NOME_ARQUIVO_SAIDA = 'projeto_completo.txt'

# Extensões que queremos ler (Backend e Frontend)
EXTENSOES_PERMITIDAS = {'.py', '.js', '.jsx', '.html', '.css', '.json'}

# Pastas para IGNORAR COMPLETAMENTE
IGNORAR_PASTAS = {
    'venv', '.venv', 'env',          # Ambientes virtuais
    'node_modules',                  # Dependências Node
    '.git', '.idea', '.vscode',      # Configurações de IDE/Git
    '__pycache__',                   # Cache do Python
    'build', 'dist',                 # Builds do Frontend
    'migrations',                    # Migrações do Django (muito arquivo inútil)
    'media', 'static', 'assets',     # Arquivos estáticos/imagens
    'public'                         # Pasta public do React (geralmente só tem ícones)
}

# Arquivos específicos para IGNORAR
IGNORAR_ARQUIVOS = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', # Travas de versão (muito grandes)
    'db.sqlite3',                                       # Banco de dados binário
    'gerar_documento.py',                               # Este script
    NOME_ARQUIVO_SAIDA                                  # O próprio arquivo de saída
}

def salvar_projeto():
    caminho_raiz = os.getcwd()
    print(f"Iniciando varredura em: {caminho_raiz}")
    print("Isso pode levar alguns segundos...")

    arquivos_processados = 0

    with open(NOME_ARQUIVO_SAIDA, 'w', encoding='utf-8') as arquivo_saida:
        arquivo_saida.write(f"--- DUMP DO PROJETO THECLINIC ---\n")
        arquivo_saida.write(f"Raiz: {caminho_raiz}\n\n")

        for root, dirs, files in os.walk(caminho_raiz):
            # 1. Modifica a lista 'dirs' in-place para impedir que o os.walk entre em pastas ignoradas
            # Isso faz o script ser muito rápido pois nem entra em node_modules ou venv
            dirs[:] = [d for d in dirs if d not in IGNORAR_PASTAS]

            for file in files:
                if file in IGNORAR_ARQUIVOS:
                    continue

                # Verifica a extensão
                _, extensao = os.path.splitext(file)
                if extensao.lower() not in EXTENSOES_PERMITIDAS:
                    continue

                caminho_completo = os.path.join(root, file)
                caminho_relativo = os.path.relpath(caminho_completo, caminho_raiz)

                # Escreve no arquivo final
                try:
                    with open(caminho_completo, 'r', encoding='utf-8') as f:
                        conteudo = f.read()
                        
                        arquivo_saida.write(f"{'='*60}\n")
                        arquivo_saida.write(f"ARQUIVO: {caminho_relativo}\n")
                        arquivo_saida.write(f"{'='*60}\n")
                        arquivo_saida.write(conteudo + "\n\n")
                        
                        arquivos_processados += 1
                        print(f"Lido: {caminho_relativo}")

                except Exception as e:
                    print(f"Erro ao ler {caminho_relativo}: {e}")

    print(f"\n--- SUCESSO! ---")
    print(f"Total de arquivos processados: {arquivos_processados}")
    print(f"Todo o código foi salvo em: {NOME_ARQUIVO_SAIDA}")
    print("Agora você pode copiar o conteúdo desse arquivo e colar no chat.")

if __name__ == "__main__":
    salvar_projeto()