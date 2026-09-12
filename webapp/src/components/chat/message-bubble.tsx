"use client";

import React from "react";
import { Bot, User, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  model?: string;
}

interface MessageProps {
  message: Message;
  onCopy?: (content: string) => void;
}

export function MessageBubble({ message, onCopy }: MessageProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[85%]",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role === "assistant" && (
        <Bot className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
      )}
      {message.role === "user" && (
        <User className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
      )}
      <div
        className={cn(
          "flex-1 min-w-0 px-4 py-2 rounded-2xl",
          message.role === "user"
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-muted text-muted-foreground rounded-tl-none"
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code: ({ children, ...props }) => (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code {...props}>{children}</code>
              </pre>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </span>
          {message.model && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
              {message.model}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="ml-auto p-1 rounded hover:bg-muted transition-colors"
            title="Copy"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}