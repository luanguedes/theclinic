from django.db import transaction

from profissionais.models import Especialidade


def _nome_key(nome):
    return str(nome or '').strip().lower()


def importar_cbo(registros):
    if not registros:
        return {
            'total_processados': 0,
            'criados': 0,
            'atualizados': 0
        }

    codigos = [item.get('codigo') for item in registros if item.get('codigo')]
    existentes_codigo = {
        esp.codigo: esp
        for esp in Especialidade.objects.filter(codigo__in=codigos)
    }

    existentes_nome = {
        _nome_key(esp.nome): esp
        for esp in Especialidade.objects.all()
    }

    novos = []
    atualizaveis = []
    total_processados = 0

    for item in registros:
        codigo = item.get('codigo')
        codigo_visual = item.get('codigo_visual')
        nome = item.get('nome')
        search_text = item.get('search_text') or ''
        if not codigo or not nome:
            continue

        total_processados += 1
        existente = existentes_codigo.get(codigo)
        if not existente:
            existente = existentes_nome.get(_nome_key(nome))

        if existente:
            if not existente.codigo:
                existente.codigo = codigo
            existente.codigo_visual = codigo_visual or existente.codigo_visual
            existente.nome = nome
            existente.search_text = search_text
            existente.status = True
            atualizaveis.append(existente)
        else:
            novos.append(Especialidade(
                codigo=codigo,
                codigo_visual=codigo_visual or '',
                nome=nome,
                search_text=search_text,
                status=True
            ))

    with transaction.atomic():
        if novos:
            for i in range(0, len(novos), 5000):
                Especialidade.objects.bulk_create(novos[i:i + 5000], ignore_conflicts=True)
        if atualizaveis:
            for i in range(0, len(atualizaveis), 5000):
                Especialidade.objects.bulk_update(
                    atualizaveis[i:i + 5000],
                    ['codigo', 'codigo_visual', 'nome', 'search_text', 'status']
                )

    return {
        'total_processados': total_processados,
        'criados': len(novos),
        'atualizados': len(atualizaveis)
    }
