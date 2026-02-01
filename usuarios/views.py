from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Operador, Privilegio
from .serializers import OperadorSerializer, PrivilegioSerializer, MinhaContaSerializer
from clinica_core.filters import AccentInsensitiveSearchFilter

class OperadorViewSet(viewsets.ModelViewSet):
    queryset = Operador.objects.all().select_related('profissional').prefetch_related('privilegios').order_by('first_name')
    serializer_class = OperadorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [AccentInsensitiveSearchFilter]
    search_fields = ['username', 'first_name', 'email']

    def _parse_bool(self, value):
        if value is None:
            return None
        normalized = str(value).strip().lower()
        if normalized in ['1', 'true', 'yes', 'sim']:
            return True
        if normalized in ['0', 'false', 'no', 'nao']:
            return False
        return None

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        is_superuser = self._parse_bool(params.get('is_superuser'))
        if is_superuser is not None:
            qs = qs.filter(is_superuser=is_superuser)

        is_active = self._parse_bool(params.get('is_active'))
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        profissional_id = params.get('profissional_id')
        if profissional_id:
            qs = qs.filter(profissional_id=profissional_id)

        return qs

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Remove senha se vier vazia
        if 'password' in request.data and not request.data['password']:
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
                request.data.pop('password')
                request.data._mutable = False
            else:
                new_data = request.data.copy()
                del new_data['password']
                request._full_data = new_data

        return super().update(request, *args, **kwargs)

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. Tenta carregar o ID do profissional com segurana moxima
        prof_id = None
        try:
            # Verifica se o atributo existe E se tem valor associado
            if hasattr(user, 'profissional') and user.profissional_id:
                prof_id = user.profissional_id
        except Exception as e:
            print(f"Aviso: Erro ao ler profissional do usuorio {user.id}: {e}")
            prof_id = None

        # 2. Tenta carregar o status de senha com segurana
        force_change = False
        try:
            # Usa getattr para evitar erro se o campo nuo for reconhecido pelo Django no momento
            force_change = getattr(user, 'force_password_change', False)
        except Exception as e:
            print(f"Aviso: Erro ao ler force_password_change: {e}")
            force_change = False

        # 3. Monta a resposta
        allowed_routes = []
        if user.is_superuser:
            allowed_routes = list(Privilegio.objects.filter(active=True).values_list('path', flat=True))
        else:
            allowed_routes = list(user.privilegios.filter(active=True).values_list('path', flat=True))

            if not allowed_routes:
                module_map = {
                    'agenda': getattr(user, 'acesso_agendamento', False),
                    'atendimento': getattr(user, 'acesso_atendimento', False),
                    'cadastros': getattr(user, 'acesso_cadastros', False),
                    'sistema': getattr(user, 'acesso_configuracoes', False),
                }
                fallback_modules = [k for k, v in module_map.items() if v]
                if fallback_modules:
                    allowed_routes = list(
                        Privilegio.objects.filter(active=True, module_key__in=fallback_modules).values_list('path', flat=True)
                    )
                if getattr(user, 'acesso_configuracoes', False):
                    allowed_routes.extend(
                        list(Privilegio.objects.filter(active=True, path='/configuracoes').values_list('path', flat=True))
                    )

        allowed_routes = sorted(set(allowed_routes))

        data = {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "email": user.email,
            "is_superuser": user.is_superuser,
            "profissional_id": prof_id,
            "force_password_change": force_change,
            "allowed_routes": allowed_routes,
            "theme_preference": getattr(user, 'theme_preference', 'light'),

            # Permisses (seguras com getattr)
            "acesso_agendamento": getattr(user, 'acesso_agendamento', False),
            "acesso_atendimento": getattr(user, 'acesso_atendimento', False),
            "acesso_faturamento": getattr(user, 'acesso_faturamento', False),
            "acesso_cadastros": getattr(user, 'acesso_cadastros', False),
            "acesso_configuracoes": getattr(user, 'acesso_configuracoes', False),
            "acesso_whatsapp": getattr(user, 'acesso_whatsapp', False),
        }
        return Response(data)

class TrocarSenhaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        nova_senha = request.data.get('nova_senha')
        senha_atual = request.data.get('senha_atual')
        confirmacao = request.data.get('confirmacao')
        if not nova_senha or len(nova_senha) < 6:
            return Response({'error': 'A senha deve ter no mnimo 6 caracteres.'}, status=400)

        user = request.user
        if confirmacao is not None and confirmacao != nova_senha:
            return Response({'error': 'A confirmauo de senha nuo coincide.'}, status=400)

        if not getattr(user, 'force_password_change', False):
            if not senha_atual or not user.check_password(senha_atual):
                return Response({'error': 'Senha atual involida.'}, status=400)

        user.set_password(nova_senha)
        
        # --- DESLIGA A OBRIGATORIEDADE APUS TROCAR ---
        user.force_password_change = False
        user.save()

        return Response({'message': 'Senha alterada com sucesso!'})


class MinhaContaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MinhaContaSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = MinhaContaSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class PrivilegioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Acesso restrito.'}, status=status.HTTP_403_FORBIDDEN)

        qs = Privilegio.objects.filter(active=True).order_by('module_order', 'item_order')
        serializer = PrivilegioSerializer(qs, many=True)
        modules = {}
        for item in serializer.data:
            key = item['module_key']
            modules.setdefault(key, {
                'key': key,
                'label': item['module_label'],
                'order': item['module_order'],
                'items': []
            })
            modules[key]['items'].append({
                'id': item['id'],
                'path': item['path'],
                'label': item['label'],
                'order': item['item_order']
            })

        ordered = sorted(modules.values(), key=lambda m: m['order'])
        for mod in ordered:
            mod['items'] = sorted(mod['items'], key=lambda i: i['order'])

        return Response({'modules': ordered})


class PrivilegioSyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Acesso restrito.'}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data or {}
        modules = payload.get('modules', [])
        if not isinstance(modules, list):
            return Response({'error': 'Payload involido.'}, status=status.HTTP_400_BAD_REQUEST)

        seen_paths = set()
        with transaction.atomic():
            for module_index, module in enumerate(modules):
                module_key = module.get('key')
                module_label = module.get('label')
                items = module.get('items', [])
                if not module_key or not module_label or not isinstance(items, list):
                    continue
                for item_index, item in enumerate(items):
                    path = item.get('path')
                    label = item.get('label')
                    if not path or not label:
                        continue
                    seen_paths.add(path)
                    Privilegio.objects.update_or_create(
                        path=path,
                        defaults={
                            'label': label,
                            'module_key': module_key,
                            'module_label': module_label,
                            'module_order': module_index,
                            'item_order': item_index,
                            'active': True
                        }
                    )

            if seen_paths:
                Privilegio.objects.exclude(path__in=seen_paths).update(active=False)

        return Response({'updated': len(seen_paths)})


