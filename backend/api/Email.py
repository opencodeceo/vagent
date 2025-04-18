# this is where the email sending function is located, this would be called by the frontend
import os
import json
import base64
import pickle
import logging.config
import re
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime
from pathlib import Path
from email.mime.text import MIMEText
from functools import lru_cache
from dataclasses import dataclass

# Third-party imports
import pytz
import openai
import google.generativeai as genai
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient import errors as google_errors
from langchain_openai import OpenAI
from langchain.memory import ConversationBufferWindowMemory
from tenacity import retry, stop_after_attempt, wait_exponential

# Configuration
@dataclass
class ServiceConfig:
    """Service configuration parameters"""
    SCOPES: List[str] = None
    LOG_LEVEL: str = "INFO"
    MAX_RETRIES: int = 3
    CACHE_TTL: int = 3600
    MAX_CONTENT_LENGTH: int = 1000

    def __post_init__(self):
        self.SCOPES = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ]

class PathConfig:
    """Path configuration"""
    BASE_DIR = Path(__file__).parent
    CREDENTIALS_PATH = BASE_DIR / './credentials.json'  
    TOKEN_PATH = BASE_DIR / './token.json'  
    LOG_CONFIG_PATH = BASE_DIR / 'logging.json'

# Logging configuration
def setup_logging() -> None:
    """Configure logging with rotation and proper formatting"""
    logging.config.dictConfig({
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'standard': {
                'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
            },
        },
        'handlers': {
            'default': {
                'level': 'INFO',
                'formatter': 'standard',
                'class': 'logging.StreamHandler',
            },
            'file': {
                'level': 'INFO',
                'formatter': 'standard',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': 'app.log',
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5,
            }
        },
        'loggers': {
            '': {  # root logger
                'handlers': ['default', 'file'],
                'level': 'INFO',
                'propagate': True
            }
        }
    })

logger = logging.getLogger(__name__)

class AIService:
    """Main service class for AI operations"""
    
    def __init__(self, config: ServiceConfig = None):
        self.config = config or ServiceConfig()
        self._setup_environment()
        self.gmail_service = None
        self.openai_llm = None
        self.gemini_model = None
        self._initialize_services()

    def _setup_environment(self) -> None:
        """Setup environment variables and configurations"""
        load_dotenv()
        required_vars = ['OPENAI_API_KEY', 'SERPAPI_API_KEY', 'GEMINI_API_KEY']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")

    def _initialize_services(self) -> None:
        """Initialize all required services"""
        self._initialize_ai_models()
        self._initialize_gmail_service()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _initialize_ai_models(self) -> None:
        """Initialize AI models with Gemini first, fallback to OpenAI"""
        try:
            # Try Gemini first - Use a potentially more stable model name
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            self.gemini_model = genai.GenerativeModel('gemini-1.5-pro') # Changed model name
            logger.info("Initialized Gemini model successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini: {e}, falling back to OpenAI")
            self.gemini_model = None # Ensure it's None if init fails
            try:
                self.openai_llm = OpenAI(temperature=0.7, openai_api_key=os.getenv("OPENAI_API_KEY"))
                logger.info("Initialized OpenAI model successfully")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI model: {e}")
                self.openai_llm = None # Ensure it's None if init fails

    def _initialize_gmail_service(self) -> None:
        """Initialize Gmail service with proper error handling"""
        logger.info("Initializing Gmail service...")  # Added log
        try:
            logger.info("Getting Gmail credentials...")  # Added log
            creds = self._get_gmail_credentials()
            logger.info("Gmail credentials obtained.")  # Added log
            self.gmail_service = build('gmail', 'v1', credentials=creds)
            logger.info("Initialized Gmail service successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gmail service: {e}")
            self.gmail_service = None
        logger.info(f"Gmail service initialized: {self.gmail_service is not None}") # Added log to check if service is initialized

    def _get_gmail_credentials(self) -> Credentials:
        """Get Gmail credentials with proper token management"""
        creds = None
        logger.info(f"Checking if token file exists at: {PathConfig.TOKEN_PATH}") # Log token path
        if PathConfig.TOKEN_PATH.exists():
            logger.info("Token file exists. Attempting to load credentials from token file.") # Log if token file exists
            try:
                with open(PathConfig.TOKEN_PATH, 'r', encoding='utf-8') as token:
                    token_data = json.load(token)
                    creds = Credentials.from_authorized_user_info(token_data, self.config.SCOPES)
            except (UnicodeDecodeError, json.JSONDecodeError) as e:
                logger.warning(f"Error reading token file: {e}")
                # Delete corrupted token file
                PathConfig.TOKEN_PATH.unlink(missing_ok=True)
        else:
            logger.info("Token file does not exist.") # Log if token file doesn't exist

        if not creds or not creds.valid:
            logger.info("Credentials not found or invalid. Attempting to refresh or obtain new credentials.") # Log if creds are invalid or not found
            if creds and creds.expired and creds.refresh_token:
                logger.info("Credentials expired and refresh token exists. Refreshing credentials.") # Log if refreshing credentials
                creds.refresh(Request())
                logger.info("Credentials refreshed.") # Log if credentials refreshed
            else:
                logger.info("No valid credentials or refresh token. Running installed app flow to obtain new credentials.") # Log if obtaining new credentials
                flow = InstalledAppFlow.from_client_secrets_file(
                    str(PathConfig.CREDENTIALS_PATH),
                    self.config.SCOPES
                )
                creds = flow.run_local_server(port=0)
                logger.info("New credentials obtained.") # Log if new credentials obtained
            
            with open(PathConfig.TOKEN_PATH, 'w', encoding='utf-8') as token:
                token.write(creds.to_json())
                logger.info("Credentials saved to token file.") # Log if credentials saved to token file
        else:
            logger.info("Valid credentials found.") # Log if valid credentials found

        return creds

    async def get_current_time(self, location: str) -> Dict[str, Any]:
        """Get current time for a location with error handling"""
        try:
            if location.lower() in ('us', 'usa'):
                return self._get_all_us_times()
            return self._get_specific_timezone(location)
        except Exception as e:
            logger.error(f"Error getting time for {location}: {e}")
            return {"status": "error", "message": str(e)}

    def _create_email_message(self, to: str, subject: str, body: str) -> MIMEText:
        """Create email message object"""
        # Ensure body is a string, default to empty if None
        safe_body = body if body is not None else ""
        message = MIMEText(safe_body)
        message['to'] = to
        message['subject'] = subject
        return {'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()}

    async def _send_email_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send email message using Gmail API"""
        return self.gmail_service.users().messages().send(userId='me', body=message).execute()

    @lru_cache(maxsize=100)
    def _get_all_us_times(self) -> Dict[str, Any]:
        """Get all US timezone times with caching"""
        us_timezones = {
            'eastern': 'US/Eastern',
            'central': 'US/Central',
            'mountain': 'US/Mountain',
            'pacific': 'US/Pacific',
            'alaska': 'US/Alaska',
            'hawaii': 'US/Hawaii'
        }
        
        current_times = []
        for zone_name, timezone in us_timezones.items():
            tz = pytz.timezone(timezone)
            current_time = datetime.now(tz)
            current_times.append(f"🕐 {zone_name.title()}: {current_time.strftime('%I:%M %p')}")
        
        return {
            "status": "success",
            "data": "\n".join(current_times),
            "type": "time"
        }

    async def send_email(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        """Send email with comprehensive error handling and logging"""
        if not self.gmail_service:
            return {"status": "error", "message": "Gmail service not initialized"}

        try:
            message = self._create_email_message(to, subject, body)
            sent_message = await self._send_email_message(message)  # Fixed: Added await for async call
            logger.info(f"Email sent successfully to {to}")
            return {
                "status": "success",
                "message_id": sent_message['id'],
                "details": {"to": to, "subject": subject}
            }
        except google_errors.HttpError as e:
            logger.error(f"Gmail API error: {e}")
            return {"status": "error", "message": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error sending email: {e}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def clean_text(text: str) -> str:
        """Clean text with improved handling"""
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n+', '\n', text)
        return text.strip()

    async def generate_text(self, prompt: str) -> str:
        """Generate text using available model with fallback"""
        generated_content = "" # Default to empty string
        try:
            if self.gemini_model:
                response = self.gemini_model.generate_content(prompt)
                generated_content = response.text
                if generated_content: # Check if Gemini returned content
                    return generated_content
                else:
                    logger.warning("Gemini returned empty content, falling back to OpenAI")
        except Exception as e:
            logger.warning(f"Gemini generation failed: {e}, falling back to OpenAI")
            
        try:
            if self.openai_llm:
                response = self.openai_llm(prompt) 
                if isinstance(response, str):
                    generated_content = response
                
                if generated_content:
                    return generated_content
                else:
                    logger.warning("OpenAI returned empty content.")
        except Exception as e:
            logger.error(f"OpenAI text generation failed: {e}")

        if not generated_content:
            logger.error("Both Gemini and OpenAI failed to generate text.")
            
        return generated_content # Return empty string if all fails
    
    async def send_email_via_assistant(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        """Send email using the AI service with proper error handling."""
        if not self.gmail_service:
            return {"status": "error", "message": "Gmail service not initialized"}
        
        try:
            message = self._create_email_message(to, subject, body)
            sent_message = await self._send_email_message(message)
            return {
                "status": "success",
                "message_id": sent_message['id'],
                "details": {"to": to, "subject": subject}
            }
        except Exception as e:
            logger.error(f"Unexpected error sending email: {e}")
            return {"status": "error", "message": str(e)}
            


async def sendEmail(service: AIService) -> None:
    """Test all service functionalities"""
    try:
        # Test time functionality
        # print("\n=== Testing Time Service ===")
        # us_time = await service.get_current_time("US")
        # print(f"US Times:\n{us_time['data']}")
        
        # Test text cleaning
        print("\n=== Testing Text Cleaning ===")
        test_text = """This is a   test
        with multiple    spaces
        and newlines"""
        cleaned = service.clean_text(test_text)
        print(f"Cleaned text: {cleaned}")
        
        # Enhanced email functionality test
        print("\n=== Email Service Test ===")
        send_test_email = input("Would you like to test email functionality? (y/n): ").lower()
        if send_test_email == 'y':
            # Gather email details
            to_email = input("Enter receiver's email address: ").strip()
            while not re.match(r"[^@]+@[^@]+\.[^@]+", to_email):
                print("Invalid email format. Please try again.")
                to_email = input("Enter receiver's email address: ").strip()
            
            email_title = input("Enter email title/subject: ").strip()
            while not email_title:
                print("Title cannot be empty. Please try again.")
                email_title = input("Enter email title/subject: ").strip()
            
            sender_name = input("Enter your name: ").strip()
            while not sender_name:
                print("Name cannot be empty. Please try again.")
                sender_name = input("Enter your name: ").strip()
            receiver_name = input("Enter the receiver's name: ").strip()
            while not receiver_name:
                print("Receiver's name cannot be empty. Please try again.")
                receiver_name = input("Enter the receiver's name: ").strip()

            # Get user's request for email content
            user_request = input("Enter your request for the email: ").strip()
            while not user_request:
                print("Request cannot be empty. Please try again.")
                user_request = input("Enter your request for the email: ").strip()

            # Generate email title if not provided
            if not email_title:
                print("\nGenerating email title...")
                try:
                    email_title = await service.generate_text(
                        f"Generate a concise email title based on: {user_request}"
                    )
                    print(f"Generated title: {email_title}")
                except Exception as e:
                    print(f"Error generating title: {str(e)}")
                    email_title = "Automated Email from AI Service"

            # Generate email body
            print("\nGenerating email body...")
            try:
                email_body = await service.generate_text(
                    f"Generate an email body based on the following request:\n\n"
                    f"{user_request}\n\nSender: {sender_name}\nReceiver: {receiver_name}"
                )
                print("Generated body:")
                print(email_body)
            except Exception as e:
                print(f"Error generating email body: {str(e)}")
                email_body = (f"Dear {receiver_name},\n\n"
                             f"This is an automated email based on your request: "
                             f"{user_request}\n\nBest regards,\n{sender_name}")

            print("\nSending  email...")
            try:
                result = await service.send_email(to_email, email_title, email_body)
                if result.get("status") == "success":
                    print(f"\n✅ Email sent successfully!")
                    print(f"Delivered to: {to_email}")
                    print(f"Subject: {email_title}")
                else:
                    print(f"\n❌ Failed to send email: {result.get('message')}")
            except Exception as e:
                print(f"\n❌ Error sending email: {str(e)}")
        
        print("\n=== Email Sent ===")

    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
        logger.error(f"Test execution failed: {e}")

def sendemail():
    try:
        setup_logging()
        logger.info("Starting AI Service test suite...")
        service = AIService()
        
        import asyncio
        if os.name == 'nt':  # Windows
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(sendEmail(service))
        
    except Exception as e:
        logger.error(f"Service initialization failed: {e}")
        print(f"❌ Error: {str(e)}")
    finally:
        logger.info("Test suite execution completed")


        

if __name__ == "__main__":
    sendemail()