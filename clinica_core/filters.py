import unicodedata

from rest_framework.filters import SearchFilter


def normalize_text(value):
    if value is None:
        return ''
    text = str(value)
    normalized = unicodedata.normalize('NFD', text)
    sem_acentos = ''.join(ch for ch in normalized if unicodedata.category(ch) != 'Mn')
    return sem_acentos.casefold()


def _resolve_attr(obj, field_path):
    current = obj
    for part in field_path.split('__'):
        if current is None:
            return ''
        current = getattr(current, part, None)
    return current


class AccentInsensitiveSearchFilter(SearchFilter):
    def filter_queryset(self, request, queryset, view):
        search_fields = self.get_search_fields(view, request)
        search_terms = self.get_search_terms(request)
        if not search_fields or not search_terms:
            return queryset

        normalized_terms = [normalize_text(term) for term in search_terms if term]
        if not normalized_terms:
            return queryset

        def normalize_value(value):
            if value is None:
                return ''
            if isinstance(value, (list, tuple, set)):
                return ' '.join(normalize_text(v) for v in value)
            return normalize_text(value)

        results = []
        for obj in queryset:
            haystacks = []
            for field in search_fields:
                field_name = field.lstrip('^=@$')
                value = _resolve_attr(obj, field_name)
                haystacks.append(normalize_value(value))
            if all(any(term in hay for hay in haystacks) for term in normalized_terms):
                results.append(obj)
        return results
