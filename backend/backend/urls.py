"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_overview(request):
    """Provide an overview of available API endpoints."""
    return JsonResponse({
        "admin": "/admin/",
        "health_check": "/api/health/",
        "send_email": "/api/send-email/",
        "process_voice_command": "/api/process-voice-command/",
    })

urlpatterns = [
    path('', api_overview, name='api_overview'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
