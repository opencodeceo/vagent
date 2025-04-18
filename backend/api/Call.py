from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions

from livekit.plugins import (
    deepgram,
    openai,
    cartesia,
    silero,
    turn_detector,
    noise_cancellation,
    google,
    elevenlabs,
)

# Import the AIService for email functionality
from .Email import AIService
import logging # Import logging

load_dotenv()

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# --- Email Tool Definition ---

# Global AIService instance (lazy initialized)
ai_service_instance = None

async def initialize_ai_service():
    """Initializes the AIService if not already done."""
    global ai_service_instance
    if ai_service_instance is None:
        logger.info("Initializing AIService...")
        try:
            # Assuming AIService() handles its own setup (env vars, logging)
            ai_service_instance = AIService()
            # If AIService has an async initialization method, call it here:
            # await ai_service_instance.async_init()
            logger.info("AIService initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize AIService: {e}", exc_info=True)
            ai_service_instance = None # Ensure it's None if init fails
    return ai_service_instance

async def send_email_tool(to: str, subject: str, body: str) -> str:
    """Sends an email to the specified recipient with the given subject and body."""
    logger.info(f"Attempting to send email via tool to: {to}")
    try:
        service = await initialize_ai_service()
        if not service or not service.gmail_service:
             logger.error("AIService or Gmail service not initialized during email sending attempt.")
             return "Error: Email service is not available or not initialized properly."

        logger.info(f"Calling AIService.send_email_via_assistant for {to}")
        result = await service.send_email_via_assistant(to=to, subject=subject, body=body)
        logger.info(f"AIService.send_email_via_assistant result: {result}")

        if result.get("status") == "success":
            logger.info(f"Email successfully sent to {to}")
            return f"Email successfully sent to {to} with subject '{subject}'."
        else:
            error_message = result.get('message', 'Unknown error sending email.')
            logger.error(f"Failed to send email via AIService: {error_message}")
            return f"Failed to send email: {error_message}"
    except Exception as e:
        logger.error(f"Exception in send_email_tool: {e}", exc_info=True)
        return f"An unexpected error occurred while trying to send the email: {e}"

# Schema describing the tool for the LLM
send_email_tool_schema = {
    "name": "send_email",
    "description": "Sends an email to a recipient using the user's configured Gmail account.",
    "parameters": {
        "type": "object",
        "properties": {
            "to": {"type": "string", "description": "The recipient's email address."},
            "subject": {"type": "string", "description": "The subject line of the email."},
            "body": {"type": "string", "description": "The main content/body of the email."},
        },
        "required": ["to", "subject", "body"],
    },
}




#  there should be a function that will analyse the prompt, if its an email, it would call the email function from "email.py"
class Assistant(Agent):
    def __init__(self) -> None:
        # Updated instructions to mention the email capability
        super().__init__(instructions="You are a helpful voice AI assistant. You can chat, answer questions, and send emails on the user's behalf using their Gmail account. If asked to send an email, use the 'send_email' tool.")


async def entrypoint(ctx: agents.JobContext):
    # Ensure the AI service is initialized before starting the session potentially
    # Although lazy initialization in the tool function might be sufficient
    # await initialize_ai_service() # Optional: pre-initialize

    await ctx.connect()

    # Updated AgentSession to include the email tool
    session = AgentSession(
        llm=google.beta.realtime.RealtimeModel(
            model="gemini-2.0-flash-exp",
            voice="Puck",
            temperature=0.8,
            # Pass the tool schema to the LLM
            # Note: The exact parameter name ('tools') might vary based on the specific LLM provider implementation in livekit-plugins
            tools=[send_email_tool_schema],
            instructions="You are a helpful voice AI assistant. You can chat, answer questions, and send emails on the user's behalf using their Gmail account. If asked to send an email, use the 'send_email' tool provided. Extract the recipient, subject, and body before calling the tool. Confirm the action after the tool is called.",
        ),
        tts=elevenlabs.TTS(
            voice_id="ODq5zmih8GrVes37Dizd",
            model="eleven_multilingual_v2"
        ),
        stt = deepgram.STT(
            model="nova-2-general",
            interim_results=True,
            smart_format=True,
            punctuate=True,
            filler_words=True,
            profanity_filter=False,
            keywords=[("LiveKit", 1.5)],
            language="en-US",
        ),
        # Map the tool name to the actual function to execute
        # Note: The exact parameter name ('tools') might vary based on the AgentSession API
        tools={"send_email": send_email_tool}
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    # Initial greeting remains the same
    await session.generate_reply(
        instructions="Greet the user and offer your assistance. Mention you can help with tasks like sending emails."
    )


if __name__ == "__main__":
    # Consider initializing the service once here if needed globally,
    # but the lazy init in the tool should handle it per-call.
    # import asyncio
    # asyncio.run(initialize_ai_service())
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))