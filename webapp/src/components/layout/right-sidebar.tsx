"use client";

import { X, User, Bot, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  messages: any[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId: string | null;
  chats: Chat[];
  currentChatTitle: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  messages: Message[];
}

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "Anthropic" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
];

const CHAT_SIDEBAR_WIDTH = 320;

export function RightSidebar({
  isOpen,
  onClose,
  currentChatId,
  chats,
  currentChatTitle,
  selectedModel,
  onModelChange,
  messages,
}: RightSidebarProps) {
  return (
    <div
      className={`fixed lg:static inset-y-0 right-0 z-40 flex flex-col border-l border-border bg-card transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
      style={{ width: 320, minWidth: 320 }}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium">Chat Details</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {currentChatId && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Chat Title</label>
            <input
              type="text"
              defaultValue={chats.find(c => c.id === currentChatId)?.title || ""}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Messages</label>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="p-2 bg-muted rounded-lg text-sm">
                  <div className="flex items-center gap-1 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {msg.role === "user" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 01-7 7h10a7 7 0 01-7 7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.548a3.374 3.374 0 00-1.223-.946l-.548-.547z" />
                      )}
                    </svg>
                    <span className="font-medium capitalize">{msg.role}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="truncate">{msg.content.slice(0, 100)}...</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}