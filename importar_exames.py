import json
import os
from django.core.management.base import BaseCommand
from sua_app.models import Exame

class Command(BaseCommand):
    help = 'Importa exames da tabela TUSS limpa'

    def handle(self, *args, **kwargs):
        caminho_json = 'exames_limpos.json'
        
        if not os.path.exists(caminho_json):
            self.stdout.write(self.style.ERROR('JSON não encontrado.'))
            return

        with open(caminho_json, 'r', encoding='utf-8') as f:
            dados = json.load(f)

        objs = []
        for item in dados:
            objs.append(Exame(
                codigo_tuss=item['codigo_tuss'],
                nome=item['nome'],
                tipo=item['tipo'],
                search_text=item['search_text']
            ))
            
            if len(objs) >= 5000:
                Exame.objects.bulk_create(objs, ignore_conflicts=True)
                objs = []
        
        if objs:
            Exame.objects.bulk_create(objs, ignore_conflicts=True)
            
        self.stdout.write(self.style.SUCCESS(f'{len(dados)} exames importados!'))