# filepath: /home/opencode/vagent/backend/api/urls.py
from django.urls import path
from django.http import JsonResponse
from . import views
from .views import send_email_api, generate_livekit_token, process_voice_command, health_check  # Correct the import name

# Simple root view function
def api_root(request):
    return JsonResponse({
        'message': 'Welcome to the API',
        'endpoints': {
            'health': '/api/health/',
            'send_email': '/api/send-email/',
            'process_voice_command': '/api/process-voice-command/',
            'livekit_token': '/api/livekit-token/',
        }
    })

urlpatterns = [
    # Root endpoint
    path('', api_root, name='api_root'),
    
    # Health check endpoint
    path('health/', health_check, name='health_check'),
    
    # Email functionality
    path('send-email/', send_email_api, name='send_email'),
    
    # Voice command processing
    path('process-voice-command/', process_voice_command, name='process_voice_command'),
    
    # LiveKit token endpoint
    path('livekit-token/', generate_livekit_token, name='livekit_token'),
]
