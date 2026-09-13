"use client";

import { useState, useEffect } from "react";
import { Brain, FileText, Search, Clock, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authHeaders } from "@/lib/api-client";

interface MemoryItem {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  tags: string[];
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchMemories();
  }, [filter]);

  const fetchMemories = async () => {
    try {
      const params = new URLSearchParams({ type: filter, search: searchQuery });
      const response = await fetch(`/api/memory?${params}`, { headers: authHeaders() });
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error("Failed to fetch memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearMemories = async () => {
    try {
      await fetch("/api/memory", { method: "DELETE", headers: authHeaders() });
      setMemories([]);
    } catch (error) {
      console.error("Failed to clear memories:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 px-6 py-4">
        <Brain className="h-8 w-8 text-teal-400" />
        <h1 className="text-2xl font-bold text-white">Memory Browser</h1>
      </div>

      <div className="flex flex-1 flex-col px-6 py-4">
        {/* Search and Filter */}
        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border bg-muted pl-10 text-white"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border-border bg-muted text-white"
          >
            <option value="all">All Types</option>
            <option value="episodic">Episodic</option>
            <option value="semantic">Semantic</option>
            <option value="procedural">Procedural</option>
            <option value="project">Project</option>
          </select>
          <Button variant="outline" onClick={clearMemories}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
          <Button variant="outline" onClick={fetchMemories}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Memory Items */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {loading ? (
            <p className="text-muted-foreground">Loading memories...</p>
          ) : memories.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-white">No memories found</p>
                <p className="text-sm text-muted-foreground">
                  Memories will appear as you interact with X-Copilot
                </p>
              </CardContent>
            </Card>
          ) : (
            memories.map((memory) => (
              <Card key={memory.id} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-white">
                    {memory.type.toUpperCase()}
                  </CardTitle>
                  <CardDescription>{memory.timestamp}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-white">{memory.content}</p>
                  <div className="mt-2 flex gap-2">
                    {memory.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs text-teal-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
