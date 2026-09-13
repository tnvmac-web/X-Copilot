"""Tests for models.py including APIMode abstraction."""

import pytest

from xcopilot.core.models import (
    APIMode,
    ChatResponse,
    EmbeddingResponse,
    ModelInfo,
    ModelProvider,
    ModelProviderBase,
    registry,
)


@pytest.fixture(autouse=True)
def reset_registry():
    """Keep the global provider registry isolated between tests."""
    registry._providers.clear()
    registry._default_provider = None
    registry._fallback_chain.clear()
    yield


class TestAPIMode:
    """Tests for the APIMode enum."""

    def test_chat_completions_value(self):
        assert APIMode.CHAT_COMPLETIONS.value == "chat_completions"

    def test_codex_responses_value(self):
        assert APIMode.CODEX_RESPONSES.value == "codex_responses"

    def test_anthropic_messages_value(self):
        assert APIMode.ANTHROPIC_MESSAGES.value == "anthropic_messages"

    def test_from_provider_openai(self):
        assert APIMode.from_provider(ModelProvider.OPENAI) == APIMode.CHAT_COMPLETIONS

    def test_from_provider_nvidia(self):
        assert APIMode.from_provider(ModelProvider.NVIDIA) == APIMode.CHAT_COMPLETIONS

    def test_from_provider_anthropic(self):
        assert APIMode.from_provider(ModelProvider.ANTHROPIC) == APIMode.ANTHROPIC_MESSAGES

    def test_from_provider_ollama(self):
        assert APIMode.from_provider(ModelProvider.OLLAMA) == APIMode.CHAT_COMPLETIONS

    def test_all_api_modes(self):
        modes = [m for m in APIMode]
        assert len(modes) == 3


class TestModelInfo:
    """Tests for ModelInfo dataclass."""

    def test_model_info_defaults(self):
        info = ModelInfo(id="test", name="Test Model", provider=ModelProvider.OPENAI)
        assert info.api_mode == APIMode.CHAT_COMPLETIONS
        assert info.capabilities == []
        assert info.context_window == 4096

    def test_model_info_with_api_mode(self):
        info = ModelInfo(
            id="test",
            name="Test Model",
            provider=ModelProvider.ANTHROPIC,
            api_mode=APIMode.ANTHROPIC_MESSAGES,
        )
        assert info.api_mode == APIMode.ANTHROPIC_MESSAGES

    def test_model_info_with_active_providers(self):
        """Verify the active providers (excluding CUSTOM)."""
        providers = [p for p in ModelProvider if p != ModelProvider.CUSTOM]
        assert len(providers) == 6
        assert ModelProvider.NVIDIA in providers
        assert ModelProvider.OPENAI in providers
        assert ModelProvider.ANTHROPIC in providers
        assert ModelProvider.OLLAMA in providers
        assert ModelProvider.LMSTUDIO in providers
        assert ModelProvider.OPENROUTER in providers


class TestChatResponse:
    """Tests for ChatResponse dataclass."""

    def test_chat_response_defaults(self):
        response = ChatResponse(content="hi", model="test", provider=ModelProvider.OPENAI)
        assert response.api_mode == APIMode.CHAT_COMPLETIONS
        assert response.finish_reason == "stop"


class TestEmbeddingResponse:
    """Tests for EmbeddingResponse dataclass."""

    def test_embedding_response_defaults(self):
        response = EmbeddingResponse(
            embeddings=[[0.1, 0.2]], model="test", provider=ModelProvider.OLLAMA
        )
        assert response.api_mode == APIMode.CHAT_COMPLETIONS


class TestModelProviderBase:
    """Tests for ModelProviderBase."""

    def test_api_mode_set_in_init(self):
        class TestProvider(ModelProviderBase):
            @property
            def provider_type(self):
                return ModelProvider.OPENAI

            async def chat(self, messages, model, **kwargs):
                pass

            async def embeddings(self, texts, model):
                pass

            async def list_models(self):
                return []

            async def health_check(self):
                return True

        provider = TestProvider({})
        assert provider.api_mode == APIMode.CHAT_COMPLETIONS

    def test_api_mode_anthropic(self):
        class AnthropicProvider(ModelProviderBase):
            @property
            def provider_type(self):
                return ModelProvider.ANTHROPIC

            async def chat(self, messages, model, **kwargs):
                pass

            async def embeddings(self, texts, model):
                pass

            async def list_models(self):
                return []

            async def health_check(self):
                return True

        provider = AnthropicProvider({})
        assert provider.api_mode == APIMode.ANTHROPIC_MESSAGES


class TestRegistry:
    """Tests for ProviderRegistry."""

    def test_registry_empty(self):
        assert len(registry._providers) == 0

    def test_registry_list_all_models(self):
        import asyncio

        result = asyncio.run(registry.list_all_models())
        assert isinstance(result, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
