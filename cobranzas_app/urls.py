"""cobranzas_app URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.views.decorators.csrf import ensure_csrf_cookie

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/clientes/', include('cliente.infrastructure.urls')),
    path('api/cobranzas/', include('cobranza.infrastructure.urls')),
    path('api/dashboard/', include('dashboard.infrastructure.urls')),
    path('api/import/', include('import_service.urls')),
    path('api/auth/', include('authentication.infrastructure.urls')),
    path('api/contactos/', include('contactos.infrastructure.urls')),
    path('', ensure_csrf_cookie(TemplateView.as_view(template_name='index.html')), name='home'),
]