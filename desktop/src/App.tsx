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

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
];

const SIDEBAR_WIDTH = 280;
const CHAT_SIDEBAR_WIDTH = 320;

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

function Header({ selectedModel, onModelChange, onNewChat, onSettings }: {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onNewChat: () => void;
  onSettings: () => void;
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
          {MODELS.map((model) => (
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
  messages 
}: { 
  isOpen: boolean;
  onClose: () => void;
  currentChatId: string | null;
  chats: Chat[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  messages: Message[];
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [projects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [, setShowNewChat] = useState(false);
  const [, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || 'Error: No response',
        timestamp: new Date(),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
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
          model={MODELS.find(m => m.id === selectedModel)?.name}
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
      />
    </div>
  );
}