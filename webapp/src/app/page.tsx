"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { Brain, MessageSquare, Plus, Copy, Send, Bot, User, Settings, Menu, X, Database, Server, Zap, ChevronLeft, ChevronRight, Trash2, Loader2, Sparkles, Search } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  model?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  path: string;
  isActive: boolean;
}

const SIDEBAR_WIDTH = 280;
const CHAT_SIDEBAR_WIDTH = 320;
type ModelOption = { id: string; name: string; provider: string };
type RuntimeSettings = {
  default_model: string;
  temperature: number;
  max_tokens: number;
  context_mode: "auto" | "fixed";
  theme: "system" | "light" | "dark";
  auto_save: boolean;
};

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});
  const [providerApiKeys, setProviderApiKeys] = useState<Record<string, string>>({});
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>({ default_model: "", temperature: 0.7, max_tokens: 4096, context_mode: "auto", theme: "system", auto_save: true });
  const [settingsError, setSettingsError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncLayout = () => {
      const wideViewport = window.innerWidth >= 1280;
      setSidebarOpen(window.innerWidth >= 1024);
      setChatSidebarOpen(wideViewport);
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);
    return () => window.removeEventListener("resize", syncLayout);
  }, []);

  useEffect(() => {
    const configuredUrl = window.localStorage.getItem("xcopilot_api_url") || process.env.NEXT_PUBLIC_XCOPILOT_API_URL || "http://127.0.0.1:8000";
    setServerUrl(configuredUrl);
    setUsername(window.localStorage.getItem("xcopilot_username") || "");
    setAuthToken(window.localStorage.getItem("xcopilot_token"));
  }, []);

  useEffect(() => {
    if (!serverUrl) return;
    refreshModels();
    fetch(`${serverUrl}/api/providers`)
      .then((response) => response.ok ? response.json() : {})
      .then(setProviderStatus)
      .catch(() => setProviderStatus({}));
  }, [serverUrl]);

  const refreshModels = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/models`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load models");
      const availableModels = await response.json() as ModelOption[];
      setModels(availableModels);
      setSelectedModel((current) => availableModels.some((model) => model.id === current) ? current : availableModels[0]?.id || "");
    } catch {
      setModels([]);
      setSelectedModel("");
    }
  };

  useEffect(() => {
    if (!serverUrl || !authToken) return;
    fetch(`${serverUrl}/api/settings`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((response) => {
        if (response.status === 401) {
          window.localStorage.removeItem("xcopilot_token");
          setAuthToken(null);
        }
        return response.ok ? response.json() : Promise.reject(new Error("Unable to load settings"));
      })
      .then((settings: RuntimeSettings) => {
        setRuntimeSettings(settings);
        if (settings.default_model) setSelectedModel(settings.default_model);
        setTheme(settings.theme);
      })
      .catch(() => undefined);
  }, [serverUrl, authToken]);

  const saveRuntimeSettings = async () => {
    const payload = JSON.stringify({ ...runtimeSettings, provider_api_keys: providerApiKeys });
    let token = authToken || await authenticate();
    let response = await fetch(`${serverUrl}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: payload,
    });
    if (response.status === 401) {
      window.localStorage.removeItem("xcopilot_token");
      setAuthToken(null);
      token = await authenticate(true);
      response = await fetch(`${serverUrl}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: payload,
      });
    }
    if (!response.ok) {
      let detail = "Unable to save X-Copilot settings";
      try {
        const error = await response.json();
        detail = error.detail || error.error || detail;
      } catch {
        // Keep the user-facing fallback when the server has no JSON error body.
      }
      throw new Error(detail);
    }
    const saved = await response.json();
    setRuntimeSettings(saved);
    setProviderStatus(Object.fromEntries((saved.configured_providers || []).map((provider: string) => [provider, "configured"])));
    setProviderApiKeys({});
    await refreshModels();
    setSelectedModel(saved.default_model);
    setTheme(saved.theme);
    document.documentElement.classList.toggle("dark", saved.theme === "dark");
    setShowSettings(false);
  };

  const authenticate = async (forceRefresh = false): Promise<string> => {
    const storedToken = window.localStorage.getItem("xcopilot_token");
    if (storedToken && !forceRefresh) {
      setAuthToken(storedToken);
      return storedToken;
    }

    if (!serverUrl || !username || !password) {
      throw new Error("Open Settings and enter the X-Copilot server, username, and password.");
    }
    const response = await fetch(`${serverUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error("Unable to authenticate with X-Copilot");

    const data = await response.json();
    window.localStorage.setItem("xcopilot_token", data.token);
    setAuthToken(data.token);
    return data.token;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    const userInput = input;
    setInput("");

    try {
      const token = authToken || await authenticate();
      if (!selectedModel) throw new Error("No real model is configured. Add a provider in the backend first.");
      const response = await fetch(`${serverUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          session_id: currentChatId,
        }),
      });

      if (response.status === 401) {
        window.localStorage.removeItem("xcopilot_token");
        setAuthToken(null);
        throw new Error("Your session expired. Please try again.");
      }
      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content || "Error: No response",
        timestamp: new Date(),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Update chat title if it's the first message
      if (currentChatId && messages.length === 1) {
        setChats((prev) => prev.map((c) => 
          c.id === currentChatId 
            ? { ...c, title: userInput.slice(0, 50) + (userInput.length > 50 ? "..." : ""), updatedAt: new Date() }
            : c
        ));
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      model: selectedModel,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages([]);
    setShowNewChat(false);
  };

  const loadChat = (chat: Chat) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setSelectedModel(chat.model);
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleRegenerate = () => {
    if (messages.length === 0) return;
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMessage) return;
    
    // Remove messages after the last user message
    const lastUserIndex = messages.findLastIndex(m => m.role === "user");
    setMessages(messages.slice(0, lastUserIndex + 1));
    setInput(lastUserMessage.content);
    handleSend({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleFeedback = (feedback: "up" | "down") => {
    console.log("Feedback:", feedback);
    // Could send to backend here
  };

  const currentChat = chats.find((c) => c.id === currentChatId);
  const currentChatTitle = currentChat?.title || "";

  const modelOptions = models.map((model) => ({ id: model.id, name: `${model.name} (${model.provider})` }));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={loadChat}
        onDeleteChat={deleteChat}
        onNewChat={createNewChat}
        showNewChat={showNewChat}
        setShowNewChat={setShowNewChat}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onNewChat={createNewChat}
          onSettings={() => setShowSettings(true)}
          models={models}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <AnimatePresence>
            {messages.length === 0 && currentChatId === null && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Brain className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-3">Welcome to X-Copilot</h2>
                <p className="text-muted-foreground mb-8 max-w-xl text-lg">
                  Your self-growing AI agent with multi-model support, MCP integration, and a unified skills marketplace.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={createNewChat} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-base">
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                  <Button variant="outline" className="px-8 py-3 border border-border rounded-xl hover:bg-muted transition-colors text-base">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Browse Chats
                  </Button>
                </div>
                
                {/* Feature highlights */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
                  {[
                    { icon: Brain, title: "Multi-Model", desc: "GPT-4, Claude, Ollama, and more" },
                    { icon: Server, title: "MCP Integration", desc: "Connect to external tools and servers" },
                    { icon: Sparkles, title: "Skills Marketplace", desc: "Extend with community skills" },
                  ].map((feature, i) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="p-4 rounded-xl bg-card border border-border text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            {messages.length > 0 && (
              <motion.div
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto w-full space-y-4"
              >
                {messages.map((message, index) => (
                  <MessageBubble
                    key={`${message.id}-${index}`}
                    message={message}
                    onCopy={copyMessage}
                    onRegenerate={handleRegenerate}
                    onFeedback={handleFeedback}
                  />
                ))}
              </motion.div>
            )}
            {isLoading && (
              <div key="loading" className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-xl rounded-tr-xl rounded-bl-xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </AnimatePresence>
        </main>

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          isLoading={isLoading}
          model={models.find((model) => model.id === selectedModel)?.name}
          models={modelOptions}
          onModelChange={setSelectedModel}
          onNewChat={createNewChat}
          onAttachFiles={() => console.log("Attach files clicked")}
        />
      </div>

      <RightSidebar
        isOpen={chatSidebarOpen}
        onClose={() => setChatSidebarOpen(false)}
        currentChatId={currentChatId}
        chats={chats}
        currentChatTitle={currentChatTitle}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        messages={messages}
        models={models}
      />

      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-foreground/30 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <section className="my-0 flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:my-4 sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Workspace</p>
                <h2 className="mt-1 text-xl font-semibold">X-Copilot settings</h2>
                <p className="mt-1 text-sm text-muted-foreground">Manage the backend connection, model, generation, and appearance.</p>
              </div>
              <button className="rounded-lg p-2 hover:bg-muted" onClick={() => setShowSettings(false)} aria-label="Close settings"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              <label className="block text-sm font-medium">Backend URL<input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={serverUrl} onChange={(event) => setServerUrl(event.target.value.replace(/\/$/, ""))} /></label>
              <label className="block text-sm font-medium">Username<input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
              <label className="block text-sm font-medium">Password<input type="password" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><div className="mb-3 text-sm font-medium">Provider API keys</div><p className="mb-3 text-xs text-muted-foreground">Keys are sent to the backend for this runtime session and are not stored in the browser.</p>{["nvidia", "openai", "anthropic", "openrouter"].map((provider) => <label className="mb-2 block text-sm font-medium capitalize" key={provider}>{provider}<input type="password" autoComplete="off" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder={`Enter ${provider} API key`} value={providerApiKeys[provider] || ""} onChange={(event) => setProviderApiKeys((current) => ({ ...current, [provider]: event.target.value }))} /></label>)}</div>
              <label className="block text-sm font-medium">Default model<select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={runtimeSettings.default_model} onChange={(event) => setRuntimeSettings((current) => ({ ...current, default_model: event.target.value }))}><option value="">Select a configured model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Temperature<input type="number" min="0" max="2" step="0.1" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={runtimeSettings.temperature} onChange={(event) => setRuntimeSettings((current) => ({ ...current, temperature: Number(event.target.value) }))} /></label><label className="block text-sm font-medium">Max tokens<input type="number" min="1" max="1000000" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={runtimeSettings.max_tokens} onChange={(event) => setRuntimeSettings((current) => ({ ...current, max_tokens: Number(event.target.value) }))} /></label></div>
              <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Context<select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={runtimeSettings.context_mode} onChange={(event) => setRuntimeSettings((current) => ({ ...current, context_mode: event.target.value as RuntimeSettings["context_mode"] }))}><option value="auto">Auto for cloud models</option><option value="fixed">Fixed limit</option></select></label><label className="flex items-center gap-2 pt-7 text-sm font-medium"><input type="checkbox" checked={runtimeSettings.auto_save} onChange={(event) => setRuntimeSettings((current) => ({ ...current, auto_save: event.target.checked }))} /> Auto-save sessions</label></div>
              <label className="block text-sm font-medium">Theme<select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={runtimeSettings.theme} onChange={(event) => setRuntimeSettings((current) => ({ ...current, theme: event.target.value as RuntimeSettings["theme"] }))}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <div className="mb-2 font-medium">Provider status</div>
              {Object.keys(providerStatus).length === 0 ? <p className="text-muted-foreground">No providers configured.</p> : Object.entries(providerStatus).map(([provider, state]) => <div className="flex justify-between py-1" key={provider}><span className="capitalize">{provider}</span><span className="text-muted-foreground">{state}</span></div>)}
            </div>
            </div>
            {settingsError && <p className="px-4 pb-3 text-sm text-destructive sm:px-6">{settingsError}</p>}
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card p-4 sm:flex-row sm:justify-end sm:p-6"><Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowSettings(false)}>Cancel</Button><Button className="w-full sm:w-auto" onClick={async () => { try { setSettingsError(""); window.localStorage.setItem("xcopilot_api_url", serverUrl); window.localStorage.setItem("xcopilot_username", username); await saveRuntimeSettings(); } catch (error) { setSettingsError(error instanceof Error ? error.message : "Unable to save settings"); } }}>Save configuration</Button></div>
          </section>
        </div>
      )}
    </div>
  );
}