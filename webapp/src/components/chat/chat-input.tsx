"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Paperclip, Mic, RotateCcw, Smile, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  placeholder?: string;
  model?: string;
  models?: { id: string; name: string }[];
  onModelChange?: (model: string) => void;
  onAttachFiles?: () => void;
  onNewChat?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "Message X-Copilot... (Shift+Enter for new line)",
  model,
  models = [],
  onModelChange,
  onAttachFiles,
  onNewChat,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* Model selector and actions bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onNewChat && (
              <Button variant="ghost" size="sm" onClick={onNewChat} className="gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Chat</span>
              </Button>
            )}
            
            {models.length > 0 && (
              <Select value={model || ""} onValueChange={onModelChange || (() => {})}>
                <SelectTrigger className="w-[200px] h-8 text-sm">
                                  <SelectValue>{model || "Select model"}</SelectValue>
                                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onAttachFiles} disabled={isLoading} aria-label="Attach files">
                          <Paperclip className="w-4 h-4" />
                        </Button>
            <Button variant="ghost" size="icon" disabled={isLoading} aria-label="Voice input">
              <Mic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled={isLoading} aria-label="Regenerate">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Input area */}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }} className="w-full">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-4 py-3 pr-14 bg-background border border-border rounded-xl resize-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all min-h-[50px] max-h-[300px]"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={!value.trim() || isLoading}
              className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="none" stroke="currentColor" strokeWidth="4" d="M4 12a8 8 0 018-8V0" />
                </svg>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}