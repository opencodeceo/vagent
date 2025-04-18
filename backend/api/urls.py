# filepath: /home/opencode/vagent/backend/api/urls.py
from django.urls import path
from django.http import JsonResponse
from . import views

# Simple root view function
def api_root(request):
    return JsonResponse({
        'message': 'Welcome to the API',
        'endpoints': {
            'health': '/api/health/',
            'send_email': '/api/send-email/',
            'process_voice_command': '/api/process-voice-command/',
        }
    })

urlpatterns = [
    # Root endpoint
    path('', api_root, name='api_root'),
    
    # Health check endpoint
    path('health/', views.health_check, name='health_check'),
    
    # Email functionality
    path('send-email/', views.send_email_api, name='send_email_api'),
    
    # Voice command processing
    path('process-voice-command/', views.process_voice_command, name='process_voice_command'),
]
