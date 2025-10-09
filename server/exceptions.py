"""
Custom exceptions for ViralForge server.
"""


class ViralForgeError(Exception):
    """Base exception for all ViralForge errors."""
    pass


class ServiceUnavailableError(ViralForgeError):
    """Raised when a required external service is unavailable."""

    def __init__(self, service_name: str, message: str = None):
        self.service_name = service_name
        default_message = f"Service '{service_name}' is unavailable"
        super().__init__(message or default_message)


class AgentExecutionError(ViralForgeError):
    """Raised when an agent or crew execution fails."""
    pass


class ToolExecutionError(ViralForgeError):
    """Raised when a tool execution fails."""
    pass


class ValidationError(ViralForgeError):
    """Raised when input validation fails."""
    pass
