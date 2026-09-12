"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
  showNewChat: boolean;
  setShowNewChat: (show: boolean) => void;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  path: string;
  isActive: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: any[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

const SIDEBAR_WIDTH = 280;

export function Sidebar({
  isOpen,
  onClose,
  projects,
  activeProject,
  onSelectProject,
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  showNewChat,
  setShowNewChat,
}: SidebarProps) {
  return (
    <>
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width: 280, minWidth: 280 }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.548a3.374 3.374 0 00-1.223-.946l-.548-.547z" />
            </svg>
            X-Copilot
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Projects Section */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Projects</h3>
            <button className="p-1 rounded hover:bg-muted transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  activeProject?.id === project.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <div className="font-medium truncate">{project.name}</div>
                <div className="text-xs opacity-70 truncate">{project.path}</div>
              </button>
            ))}
            {projects.length === 0 && (
              <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                No projects yet. Click + to add.
              </button>
            )}
          </div>
        </div>

        {/* Chats Section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground">Chats</h3>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 p-2">
            {chats.map((chat) => (
              <div key={chat.id} className="relative group">
                <button
                  onClick={() => onSelectChat(chat)}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    currentChatId === chat.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium truncate">{chat.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {chat.messages.length} messages
                  </div>
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1h-5.5" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {chats.length === 0 && !showNewChat && (
              <div className="text-center text-muted-foreground py-8">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">No chats yet</p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-2 text-primary hover:underline text-sm"
                >
                  Start a new chat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <span>Memory</span>
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2" />
            </svg>
            <span>MCP Servers</span>
          </button>
        </div>
      </div>
    </>
  );
}