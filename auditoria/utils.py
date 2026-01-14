from threading import local


_state = local()


def set_current_request(request):
    _state.request = request


def get_current_request():
    return getattr(_state, 'request', None)


def get_current_user():
    request = get_current_request()
    if not request:
        return None
    return getattr(request, 'user', None)
