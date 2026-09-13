"""Minimal conversation loop for prompt processing and tool execution."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import httpx

from xcopilot.core.models import ChatMessage, ChatResponse, registry


class ConversationLoop:
    """Lightweight agent loop used by the local API and CLI entrypoints."""

    def __init__(self) -> None:
        self._sessions: dict[str, list[ChatMessage]] = {}

    def get_session_state(self, session_id: str) -> list[ChatMessage]:
        """Return the current message history for a session."""
        return list(self._sessions.get(session_id, []))

    async def process_prompt(
        self,
        session_id: str,
        messages: list[ChatMessage],
        model: str,
        *,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        context_mode: str = "auto",
        stream: bool = False,
    ) -> ChatResponse | AsyncIterator[ChatResponse]:
        """Process a user prompt and return an assistant response."""
        if not messages:
            raise ValueError("At least one message is required")

        history = self._sessions.setdefault(session_id, [])
        history.extend(messages)
        request_messages = messages
        if context_mode == "auto":
            request_messages, max_tokens = await self._fit_context(messages, model, max_tokens)

        try:
            return await registry.chat_with_fallback(
                request_messages,
                model,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=stream,
            )
        except (httpx.HTTPError, ValueError, RuntimeError) as exc:
            raise RuntimeError(
                f"No configured model provider could serve '{model}'. "
                f"{type(exc).__name__}: {exc}. "
                "Check the provider key, model ID, and backend connectivity."
            ) from exc

    async def _fit_context(
        self,
        messages: list[ChatMessage],
        model: str,
        max_tokens: int | None,
    ) -> tuple[list[ChatMessage], int | None]:
        """Fit cloud requests to the selected model context window."""
        model_info = None
        for provider_models in (await registry.list_all_models()).values():
            model_info = next((item for item in provider_models if item.id == model), None)
            if model_info:
                break
        if not model_info or not model_info.context_window:
            return messages, max_tokens

        output_tokens = min(max_tokens or model_info.max_output_tokens, model_info.max_output_tokens)
        input_budget = max(model_info.context_window - output_tokens, 256)
        estimated_tokens = sum(max(1, len(message.content) // 4) for message in messages)
        if estimated_tokens <= input_budget:
            return messages, output_tokens

        system_messages = [message for message in messages if message.role == "system"]
        remaining = input_budget - sum(max(1, len(message.content) // 4) for message in system_messages)
        selected: list[ChatMessage] = []
        for message in reversed([item for item in messages if item.role != "system"]):
            message_tokens = max(1, len(message.content) // 4)
            if message_tokens > remaining:
                break
            selected.append(message)
            remaining -= message_tokens
        selected.reverse()
        return system_messages + selected, output_tokens

    async def handle_tool_call(self, tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
        """Handle a tool call request from the model."""
        return {
            "tool": tool_name,
            "args": args,
            "status": "not_implemented",
            "result": "Tool execution is not enabled for this model runtime.",
        }

    async def handle_clarification(self, question: str, choices: list[str] | None = None) -> str:
        """Return a safe clarification response."""
        if choices:
            return choices[0]
        return question

    async def handle_approval(self, command: str) -> bool:
        """Default approvals require explicit user confirmation outside the runtime."""
        return command.strip() == ""
