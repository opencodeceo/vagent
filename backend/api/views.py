# filepath: /home/opencode/vagent/backend/api/views.py
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import asyncio
import json
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from livekit import api
import os
# Import our AIService and other tools
from .Email import AIService
from .Call import initialize_ai_service, send_email_tool
from livekit import api


# Initialize the AI service once for the whole application
ai_service_instance = None

async def get_ai_service():
    """Get or initialize the AI service instance"""
    global ai_service_instance
    if ai_service_instance is None:
        ai_service_instance = await initialize_ai_service()
    return ai_service_instance


@api_view(['POST'])
def send_email_api(request):
    """
    API endpoint to send emails
    Expects JSON data with:
    {
        "to": "recipient@example.com",
        "subject": "Email Subject",
        "body": "Email Body"
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ['to', 'subject', 'body']
        for field in required_fields:
            if field not in data:
                return Response(
                    {'error': f'Missing required field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Use asyncio.run() to execute the async function
        try:
            result = asyncio.run(
                send_email_tool(
                    to=data['to'],
                    subject=data['subject'],
                    body=data['body']
                )
            )
        except RuntimeError as e:
            # Handle cases where asyncio.run() cannot be used (e.g., nested loops)
            # Fallback to creating a new loop if necessary, though asyncio.run is preferred
            if "cannot be called from a running event loop" in str(e):
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(
                    send_email_tool(
                        to=data['to'],
                        subject=data['subject'],
                        body=data['body']
                    )
                )
                loop.close()
            else:
                raise e # Re-raise other runtime errors
        
        # Check if the result contains an error message
        if "Error:" in result or "Failed to send email" in result or "unexpected error" in result:
            return Response({'error': result}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'success': True, 'message': result}, status=status.HTTP_200_OK)
    
    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON data'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Log the exception for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in send_email_api: {e}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def health_check(request):
    """Simple health check endpoint"""
    return Response({'status': 'ok'}, status=status.HTTP_200_OK)


@api_view(['POST'])
def process_voice_command(request):
    """
    Process a voice command transcription and decide what action to take
    Expects JSON data with:
    {
        "text": "transcribed voice command"
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required field
        if 'text' not in data:
            return Response(
                {'error': 'Missing required field: text'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        text = data['text'].lower()
        
        # Simple keyword-based logic to decide if this is an email command
        email_keywords = [
            'send an email', 'send email', 'write an email', 'compose an email',
            'email to', 'send a message', 'write a message', 'compose a message'
        ]
        
        is_email_request = any(keyword in text for keyword in email_keywords)
        
        if is_email_request:
            # For now just return that we detected an email request
            # In a more advanced implementation, we could extract recipient, subject, etc.
            return Response({
                'action': 'email',
                'detected': True,
                'message': 'Email request detected. Please provide recipient, subject, and body.'
            })
        else:
            # Not an email request, could be handled by other AI functions
            return Response({
                'action': 'other',
                'detected': False,
                'message': 'No specific action detected. Processing as general query.'
            })
            
    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON data'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt # Use csrf_exempt for simplicity in this example, consider proper CSRF handling for production
# def generate_livekit_token(request):
#     if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
#         return JsonResponse({'error': 'LiveKit API key or secret not configured'}, status=500)

#     room_name = request.GET.get('room', 'default-voice-room')
#     username = request.GET.get('username', 'anonymous-user')
    
#     try:
#         # Create a LiveKit access token
#         token = api.AccessToken(os.getenv('LIVEKIT_API_KEY'), os.getenv('LIVEKIT_API_SECRET')) \
#             .with_identity("identity") \
#             .with_name("name") \
#             .with_grants(api.VideoGrants(
#                 room_join=True,
#                 room="my-room",
#             )).to_jwt()
        
#         # Define grant permissions for the token
#         grant = api.VideoGrant(room_join=True, room=room_name)
        
#         # Set identity and name (can be customized)
#         token.identity = username
#         token.name = username
#         token.add_grant(grant)
        
#         # Generate the JWT token string
        
#         return JsonResponse({
#             'token': token,
#             'room': room_name,
#             'username': username
#         })
#     except Exception as e:
#         print(f"Error generating LiveKit token: {e}")
#         return JsonResponse({'error': 'Failed to generate LiveKit token'}, status=500)


def generate_livekit_token(request):
    token = api.AccessToken(os.getenv('LIVEKIT_API_KEY'), os.getenv('LIVEKIT_API_SECRET')) \
    .with_identity("identity") \
    .with_name("name") \
    .with_grants(api.VideoGrants(
        room_join=True,
        room="my-room",
    )).to_jwt()
    return token