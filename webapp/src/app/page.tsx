"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Header } from "@/components/layout/header";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { Sidebar } from "@/components/layout/sidebar";

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

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
];

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [projects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const createNewChat = () => {
    const chat: Chat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      model: selectedModel,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats((current) => [chat, ...current]);
    setCurrentChatId(chat.id);
    setMessages([]);
  };

  const selectChat = (chat: Chat) => {
    setCurrentChatId(chat.id);
    setSelectedModel(chat.model);
    setMessages(chat.messages);
  };

  const deleteChat = (chatId: string) => {
    setChats((current) => current.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation.map(({ role, content }) => ({ role, content })),
          model: selectedModel,
        }),
      });
      if (!response.ok) throw new Error("The chat service is unavailable.");
      const data = await response.json();
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content || "No response returned.",
        timestamp: new Date(),
        model: selectedModel,
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: error instanceof Error ? error.message : "Something went wrong.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId);
  const selectedModelName = MODELS.find((model) => model.id === selectedModel)?.name;

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onNewChat={createNewChat}
        showNewChat={false}
        setShowNewChat={() => createNewChat()}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <Header
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onNewChat={createNewChat}
          onSettings={() => setDetailsOpen((open) => !open)}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace</p>
              <h1 className="text-lg font-semibold">{currentChat?.title || "New conversation"}</h1>
            </div>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ready · {selectedModelName}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Sparkles className="h-8 w-8" />
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">X-Copilot</p>
                <h2 className="text-3xl font-semibold tracking-tight">What are we building today?</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  Ask questions, shape ideas, or send a task to your multi-model workspace.
                </p>
                <div className="mt-8 grid w-full max-w-xl gap-3 text-left sm:grid-cols-3">
                  {["Review a code change", "Plan a new feature", "Explain a concept"].map((prompt) => (
                    <button key={prompt} onClick={() => setInput(prompt)} className="rounded-xl border border-border bg-card p-4 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <Bot className="mb-5 h-4 w-4 text-primary" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {messages.map((message) => <MessageBubble key={message.id} message={message} onCopy={(content) => navigator.clipboard.writeText(content)} />)}
                {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking...</div>}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border/70 bg-card/60 px-4 py-4 sm:px-8">
            <ChatInput value={input} onChange={setInput} onSubmit={sendMessage} isLoading={isLoading} model={selectedModelName} />
          </div>
        </div>
      </section>

      <RightSidebar
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        currentChatId={currentChatId}
        chats={chats}
        currentChatTitle={currentChat?.title || ""}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        messages={messages}
      />
    </main>
  );
}
