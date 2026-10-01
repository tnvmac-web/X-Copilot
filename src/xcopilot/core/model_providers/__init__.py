"""Model providers package init."""

from __future__ import annotations

from xcopilot.core.model_providers.anthropic_provider import register_anthropic
from xcopilot.core.model_providers.lmstudio_provider import register_lmstudio
from xcopilot.core.model_providers.nvidia_provider import register_nvidia
from xcopilot.core.model_providers.ollama_provider import register_ollama
from xcopilot.core.model_providers.openai_provider import register_openai
from xcopilot.core.model_providers.openrouter_provider import register_openrouter
from xcopilot.core.models import APIMode

__all__ = [
    "register_anthropic",
    "register_lmstudio",
    "register_nvidia",
    "register_ollama",
    "register_openai",
    "register_openrouter",
]


PROVIDER_API_MODES = {
    "openai": APIMode.CHAT_COMPLETIONS,
    "nvidia": APIMode.CHAT_COMPLETIONS,
    "openrouter": APIMode.CHAT_COMPLETIONS,
    "ollama": APIMode.CHAT_COMPLETIONS,
    "lmstudio": APIMode.CHAT_COMPLETIONS,
    "anthropic": APIMode.ANTHROPIC_MESSAGES,
}


def _resolve_provider(value: str):
    """Map a provider name from config onto a ModelProvider enum member."""
    from xcopilot.core.models import ModelProvider

    try:
        return ModelProvider(str(value).strip().lower())
    except ValueError:
        return None


def _apply_routing(config: dict) -> None:
    """Apply the configured default provider and fallback chain to the registry.

    The registry needs an explicit routing order: `chat_with_fallback()` only
    walks the default provider plus the fallback chain, so registering providers
    without applying routing makes every chat request fail. Falls back to the
    first registered provider when no default is configured.
    """
    from xcopilot.core.models import ModelProvider, registry

    default = _resolve_provider(config.get("default", ""))
    if default is not None and registry.get(default) is not None:
        registry.set_default(default)

    chain = [
        provider
        for provider in (_resolve_provider(name) for name in config.get("fallback_chain", []))
        if provider is not None
    ]
    if chain:
        registry.set_fallback_chain(chain)

    # No usable default: prefer a local provider, else the first registered one,
    # so single-provider setups still route without extra configuration.
    if registry._default_provider is None and registry._providers:
        local = (
            ModelProvider.OLLAMA if registry.get(ModelProvider.OLLAMA) else ModelProvider.LMSTUDIO
        )
        fallback = local if registry.get(local) else next(iter(registry._providers))
        registry.set_default(fallback)


def register_all_providers(config: dict | None = None) -> None:
    """Register all available model providers."""
    config = config or {}

    # Register providers with their configs
    if config.get("openai"):
        register_openai(config["openai"])
    if config.get("anthropic"):
        register_anthropic(config["anthropic"])
    if config.get("ollama"):
        register_ollama(config["ollama"])
    if config.get("lmstudio"):
        register_lmstudio(config["lmstudio"])
    if config.get("openrouter"):
        register_openrouter(config["openrouter"])
    if config.get("nvidia"):
        register_nvidia(config["nvidia"])

    # Apply the configured default provider and fallback chain. Without this the
    # registry has providers but no routing order, so chat_with_fallback() tries
    # nothing and every request fails with "No provider available for model X".
    _apply_routing(config)

    # Auto-register Ollama and LM Studio if running (no API key needed)
    # This allows local models to work out of the box
    try:
        import asyncio

        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Can't run async here, will be checked on first use
            pass
    except (RuntimeError, AttributeError):
        pass
