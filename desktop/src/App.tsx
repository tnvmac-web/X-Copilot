import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Settings, Menu, X, Plus, MessageSquare, Copy, Check, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
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

type ModelOption = { id: string; name: string; provider: string };

const SIDEBAR_WIDTH = 280;
const CHAT_SIDEBAR_WIDTH = 320;
const API_BASE_URL = import.meta.env.VITE_XCOPILOT_API_URL || 'http://127.0.0.1:8000';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
};

const buttonVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const buttonSizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

function Button({ className, variant = 'default', size = 'default', children, ...props }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

  return (
    <button
      className={cn(baseStyles, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

function MessageBubble({ message, onCopy }: { message: Message; onCopy?: (content: string) => void }) {
  const [copied, setCopied] = useState(false);

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
        'flex gap-2 max-w-[85%]',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.role === 'assistant' && (
        <Bot className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
      )}
      {message.role === 'user' && (
        <User className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
      )}
      <div
        className={cn(
          'flex-1 min-w-0 px-4 py-2 rounded-2xl',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-muted text-muted-foreground rounded-tl-none'
        )}
      >
        <pre className="whitespace-pre-wrap text-sm">{message.content}</pre>
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
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatInput({ value, onChange, onSubmit, isLoading, model }: { 
  value: string; 
  onChange: (value: string) => void; 
  onSubmit: (e: React.FormEvent) => void; 
  isLoading?: boolean; 
  model?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }} className="w-full">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message X-Copilot... (Shift+Enter for new line)"
            className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl resize-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all min-h-[50px] max-h-[200px]"
            rows={1}
          />
        </div>
        <Button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Press Enter to send, Shift+Enter for new line | Model: {model || 'Select a model'}
      </p>
    </form>
  );
}

function Sidebar({ 
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
  setShowNewChat 
}: { 
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project | null) => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
  setShowNewChat: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
      style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold">X-Copilot</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Projects</h3>
          <div className="space-y-1">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-left transition-colors',
                  activeProject?.id === project.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {project.name}
              </button>
            ))}
            <Button variant="outline" className="w-full" size="sm" onClick={() => onSelectProject(null)}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chats</h3>
            <Button variant="ghost" size="sm" onClick={() => { onNewChat(); setShowNewChat(true); }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {chats.map((chat) => (
              <div key={chat.id} className="relative group">
                <button
                  onClick={() => onSelectChat(chat)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left transition-colors text-sm truncate',
                    currentChatId === chat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  {chat.title}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ selectedModel, onModelChange, onNewChat, onSettings, models }: {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onNewChat: () => void;
  onSettings: () => void;
  models: ModelOption[];
}) {
  return (
    <header className="flex items-center justify-between h-16 px-4 border-b border-border bg-card">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onNewChat}>
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg">X-Copilot</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
        
        <Button variant="ghost" size="icon" onClick={onNewChat}>
          <Plus className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings}>
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}

function RightSidebar({ 
  isOpen, 
  onClose, 
  currentChatId, 
  chats, 
  selectedModel, 
  onModelChange, 
  messages,
  models,
}: { 
  isOpen: boolean;
  onClose: () => void;
  currentChatId: string | null;
  chats: Chat[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  messages: Message[];
  models: ModelOption[];
}) {
  return (
    <div
      className={cn(
        'fixed lg:static inset-y-0 right-0 z-40 flex flex-col border-l border-border bg-card transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}
      style={{ width: CHAT_SIDEBAR_WIDTH, minWidth: CHAT_SIDEBAR_WIDTH }}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium">Chat Details</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {currentChatId && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Chat Title</label>
            <input
              type="text"
              defaultValue={chats.find(c => c.id === currentChatId)?.title || ''}
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
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Messages</label>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {messages.map((msg, index) => (
                <div key={`${msg.id}-${index}`} className="p-2 bg-muted rounded-lg text-sm">
                  <div className="flex items-center gap-1 mb-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {msg.role === 'user' ? (
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

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [projects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(API_BASE_URL);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});
  const [providerApiKeys, setProviderApiKeys] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncLayout = () => {
      setSidebarOpen(window.innerWidth >= 1024);
      setChatSidebarOpen(window.innerWidth >= 1280);
    };

    syncLayout();
    window.addEventListener('resize', syncLayout);
    return () => window.removeEventListener('resize', syncLayout);
  }, []);

  useEffect(() => {
    const configuredUrl = window.localStorage.getItem('xcopilot_api_url') || API_BASE_URL;
    setServerUrl(configuredUrl);
    setUsername(window.localStorage.getItem('xcopilot_username') || '');
    refreshModels(configuredUrl);
    fetch(`${configuredUrl}/api/providers`).then((response) => response.ok ? response.json() : {}).then(setProviderStatus).catch(() => setProviderStatus({}));
  }, []);

  const refreshModels = async (url = serverUrl) => {
    try {
      const response = await fetch(`${url}/api/models`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load models');
      const available = await response.json() as ModelOption[];
      setModels(available);
      setSelectedModel((current) => available.some((model) => model.id === current) ? current : available[0]?.id || '');
    } catch {
      setModels([]);
      setSelectedModel('');
    }
  };

  const authenticate = async (): Promise<string> => {
    const storedToken = window.localStorage.getItem('xcopilot_token');
    if (storedToken) {
      setAuthToken(storedToken);
      return storedToken;
    }

    if (!serverUrl || !username || !password) throw new Error('Open Settings and enter the X-Copilot server, username, and password.');
    const response = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error('Unable to authenticate with X-Copilot');

    const data = await response.json();
    window.localStorage.setItem('xcopilot_token', data.token);
    setAuthToken(data.token);
    return data.token;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const chatId = currentChatId || crypto.randomUUID();
    const conversation = [...messages, userMessage];
    if (!currentChatId) {
      setCurrentChatId(chatId);
      setChats((prev) => [{
        id: chatId,
        title: userMessage.content.slice(0, 34),
        messages: conversation,
        model: selectedModel,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, ...prev]);
    }
    setMessages(conversation);
    setIsLoading(true);
    setInput('');

    try {
      if (!selectedModel) throw new Error('No real model is configured. Add a provider in the backend first.');
      const token = authToken || await authenticate();
      const response = await fetch(`${serverUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: conversation.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          session_id: chatId,
        }),
      });

      if (response.status === 401) {
        window.localStorage.removeItem('xcopilot_token');
        setAuthToken(null);
        throw new Error('Your session expired. Please try again.');
      }
      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || 'Error: No response',
        timestamp: new Date(),
        model: selectedModel,
      };
      const completedConversation = [...conversation, assistantMessage];
      setMessages(completedConversation);
      setChats((prev) => prev.map((chat) => chat.id === chatId
        ? { ...chat, messages: completedConversation, updatedAt: new Date() }
        : chat));
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      const failedConversation = [...conversation, errorMessage];
      setMessages(failedConversation);
      setChats((prev) => prev.map((chat) => chat.id === chatId
        ? { ...chat, messages: failedConversation, updatedAt: new Date() }
        : chat));
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: 'New Chat',
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

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && currentChatId === null && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Bot className="h-8 w-8" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">X-Copilot</p>
              <h2 className="text-3xl font-semibold tracking-tight">What are we building today?</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                Ask questions, shape ideas, or send a task to your multi-model workspace.
              </p>
              <div className="mt-8 grid w-full max-w-xl grid-cols-3 gap-3 text-left">
                {["Review a code change", "Plan a new feature", "Explain a concept"].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { createNewChat(); setInput(prompt); }}
                    className="rounded-xl border border-border bg-card p-4 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <MessageSquare className="mb-5 h-4 w-4 text-primary" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.length > 0 && (
            <div className="max-w-3xl mx-auto w-full space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={`${message.id}-${index}`}
                  message={message}
                  onCopy={copyMessage}
                />
              ))}
            </div>
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <Bot className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex gap-1">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" style={{ animationDelay: '0.1s' }} />
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          isLoading={isLoading}
          model={models.find((model) => model.id === selectedModel)?.name}
        />
      </div>

      <RightSidebar
        isOpen={chatSidebarOpen}
        onClose={() => setChatSidebarOpen(false)}
        currentChatId={currentChatId}
        chats={chats}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        messages={messages}
        models={models}
      />

      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-foreground/30 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <section className="my-0 flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:my-4 sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4 sm:p-6">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Connection</p><h2 className="mt-1 text-xl font-semibold">X-Copilot settings</h2><p className="mt-1 text-sm text-muted-foreground">Configure the backend and real model credentials.</p></div>
              <button className="rounded-lg p-2 hover:bg-muted" onClick={() => setShowSettings(false)} aria-label="Close settings"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              <label className="block text-sm font-medium">Backend URL<input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={serverUrl} onChange={(event) => setServerUrl(event.target.value.replace(/\/$/, ''))} /></label>
              <label className="block text-sm font-medium">Username<input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
              <label className="block text-sm font-medium">Password<input type="password" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><div className="mb-3 text-sm font-medium">Provider API keys</div><p className="mb-3 text-xs text-muted-foreground">Keys are sent to the backend for this runtime session and are not stored locally.</p>{['nvidia', 'openai', 'anthropic', 'openrouter'].map((provider) => <label className="mb-2 block text-sm font-medium capitalize" key={provider}>{provider}<input type="password" autoComplete="off" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder={`Enter ${provider} API key`} value={providerApiKeys[provider] || ''} onChange={(event) => setProviderApiKeys((current) => ({ ...current, [provider]: event.target.value }))} /></label>)}</div>
              <div className="rounded-xl bg-muted/60 p-4 text-sm"><div className="mb-2 font-medium">Provider status</div>{Object.keys(providerStatus).length === 0 ? <p className="text-muted-foreground">No providers configured.</p> : Object.entries(providerStatus).map(([provider, state]) => <div className="flex justify-between py-1" key={provider}><span className="capitalize">{provider}</span><span className="text-muted-foreground">{state}</span></div>)}</div>
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card p-4 sm:flex-row sm:justify-end sm:p-6"><Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowSettings(false)}>Cancel</Button><Button className="w-full sm:w-auto" onClick={async () => { window.localStorage.setItem('xcopilot_api_url', serverUrl); window.localStorage.setItem('xcopilot_username', username); try { const token = authToken || await authenticate(); const response = await fetch(`${serverUrl}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ provider_api_keys: providerApiKeys }) }); if (!response.ok) throw new Error('Unable to save provider settings'); setProviderApiKeys({}); const saved = await response.json(); setProviderStatus(Object.fromEntries((saved.configured_providers || []).map((provider: string) => [provider, 'configured']))); await refreshModels(serverUrl); setShowSettings(false); } catch (error) { console.error(error); } }}>Save configuration</Button></div>
          </section>
        </div>
      )}
    </div>
  );
}