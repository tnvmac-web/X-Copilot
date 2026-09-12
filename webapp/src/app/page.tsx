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

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "Anthropic" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
];

const SIDEBAR_WIDTH = 280;
const CHAT_SIDEBAR_WIDTH = 320;

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
        }),
      });

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

  const modelOptions = MODELS.map(m => ({ id: m.id, name: `${m.name} (${m.provider})` }));

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
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <AnimatePresence mode="wait">
            {messages.length === 0 && currentChatId === null && (
              <motion.div
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto w-full space-y-4"
              >
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onCopy={copyMessage}
                    onRegenerate={handleRegenerate}
                    onFeedback={handleFeedback}
                  />
                ))}
              </motion.div>
            )}
            {isLoading && (
              <div className="flex justify-start">
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
          model={MODELS.find(m => m.id === selectedModel)?.name}
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
      />
    </div>
  );
}