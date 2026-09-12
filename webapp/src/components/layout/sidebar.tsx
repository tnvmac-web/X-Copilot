"use client";

import { useState } from "react";
import { 
  Brain, X, Plus, MessageSquare, Database, Server, Settings, 
  ChevronRight, ChevronLeft, FolderOpen, Trash2, Edit2, 
  History, Sparkles, LayoutDashboard, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project | null) => void;
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
const COLLAPSED_WIDTH = 72;

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
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setCollapsed(false)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-[72px]" : "w-[280px]"
        )}
        style={{ minWidth: collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <h1 className="text-xl font-bold flex items-center gap-2 transition-opacity duration-200">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <span>X-Copilot</span>
            </h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
              <Brain className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1" role="navigation" aria-label="Main navigation">
          <button
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
            onClick={onNewChat}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && <span className="font-medium text-foreground">New Chat</span>}
          </button>

          <button className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          )}>
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
            </div>
            {!collapsed && <span className="text-muted-foreground">Dashboard</span>}
          </button>

          <button className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          )}>
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
              <History className="w-4 h-4 text-muted-foreground" />
            </div>
            {!collapsed && <span className="text-muted-foreground">History</span>}
          </button>

          <button className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          )}>
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
            </div>
            {!collapsed && <span className="text-muted-foreground">Skills</span>}
          </button>

          <div className="border-t border-border my-2" />

          {/* Projects Section */}
          {!collapsed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Projects
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSelectProject(null)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1 px-1 max-h-48 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                      "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                      activeProject?.id === project.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                    )}
                    title={project.path}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{project.path}</div>
                    </div>
                  </button>
                ))}
                {projects.length === 0 && (
                  <button 
                    onClick={() => onSelectProject(null)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-sm">Add project</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Chats Section */}
          <div className={cn(
            "flex-1 overflow-hidden flex flex-col min-h-0",
            collapsed && "items-center"
          )}>
            {!collapsed && (
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Chats
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { onNewChat(); setShowNewChat(true); }}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            <div className={cn(
              "flex-1 overflow-y-auto space-y-1 px-1",
              collapsed && "items-center px-0"
            )}>
              {chats.map((chat) => (
                <div key={chat.id} className="relative group">
                  <button
                    onClick={() => onSelectChat(chat)}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200",
                      "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                      currentChatId === chat.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground",
                      collapsed && "justify-center"
                    )}
                    title={collapsed ? chat.title : undefined}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      currentChatId === chat.id
                        ? "bg-primary/10"
                        : "bg-muted/50"
                    )}>
                      <MessageSquare className={cn(
                        "w-4 h-4",
                        currentChatId === chat.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    {!collapsed && (
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="font-medium truncate">{chat.title}</div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <span>{chat.messages.length} messages</span>
                          <span>•</span>
                          <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </button>
                  
                  {!collapsed && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowNewChat(true); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                        title="Continue chat"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5l7 7-7 7M15 12H3" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {chats.length === 0 && !showNewChat && !collapsed && (
                <div className="text-center text-muted-foreground py-8 px-4">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-sm mb-2">No chats yet</p>
                  <button
                    onClick={() => { onNewChat(); setShowNewChat(true); }}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Start a new chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Bottom Settings */}
        <div className="p-2 border-t border-border space-y-1">
          {collapsed ? (
            <>
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-all" title="Settings">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-all" title="Memory">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Database className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-all" title="MCP Servers">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Server className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            </>
          ) : (
            <>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <Database className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Memory</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <Server className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">MCP Servers</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}