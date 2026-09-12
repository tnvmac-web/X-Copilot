"use client";

import React from "react";
import { Bot, User, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Button } from "@/components/ui/button";

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
  onRegenerate?: () => void;
  onFeedback?: (feedback: "up" | "down") => void;
}

export function MessageBubble({ message, onCopy, onRegenerate, onFeedback }: MessageProps) {
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
        "flex gap-3 max-w-[85%] animate-fade-in",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role === "assistant" && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      {message.role === "user" && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center mt-0.5">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={cn(
          "flex-1 min-w-0 relative",
          message.role === "user" ? "" : ""
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl transition-colors",
            message.role === "user"
              ? "bg-primary text-primary-foreground rounded-tr-lg rounded-br-lg rounded-tl-xl"
              : "bg-muted text-muted-foreground rounded-tl-xl rounded-tr-xl rounded-bl-xl"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              code: ({ children, ...props }) => (
                <pre className="bg-gray-900/50 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono relative group">
                  <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 font-medium">Code</span>
                    <button
                      onClick={() => {
                        const code = (children as React.ReactElement).props.children;
                        navigator.clipboard.writeText(code as string);
                      }}
                      className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                      title="Copy code"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <code {...props}>{children}</code>
                </pre>
              ),
              blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-2">
                                {children}
                              </blockquote>
                            ),
                          }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Message actions bar */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity group">
          {message.role === "assistant" && (
            <>
              <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCopy}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              title="Copy"
                            >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRegenerate}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                title="Regenerate response"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFeedback?.("up")}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                title="Good response"
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFeedback?.("down")}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                title="Bad response"
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </>
          )}
          
          <div className="flex-1" />
          
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {message.model && (
              <span className="px-2 py-0.5 bg-muted/50 rounded text-[10px] font-medium">
                {message.model}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}