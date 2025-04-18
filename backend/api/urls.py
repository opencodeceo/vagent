# filepath: /home/opencode/vagent/backend/api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Health check endpoint
    path('health/', views.health_check, name='health_check'),
    
    # Email functionality
    path('send-email/', views.send_email_api, name='send_email_api'),
    
    # Voice command processing
    path('process-voice-command/', views.process_voice_command, name='process_voice_command'),
]
