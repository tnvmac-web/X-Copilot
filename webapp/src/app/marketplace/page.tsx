"use client";

import { useState, useEffect } from "react";
import { Search, Puzzle, Download, Zap, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SkillRepo {
  id: string;
  name: string;
  description: string;
  skills: number;
  owner: string;
  rating: number;
  category: string;
}

export default function MarketplacePage() {
  const [repos, setRepos] = useState<SkillRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketplace();
  }, []);

  const fetchMarketplace = async () => {
    try {
      const response = await fetch("/api/skills/marketplace");
      if (response.ok) {
        const data = await response.json();
        setRepos(data.repos || []);
      }
    } catch (error) {
      console.error("Failed to fetch marketplace:", error);
    } finally {
      setLoading(false);
    }
  };

  const installRepo = async (repoId: string) => {
    try {
      await fetch(`/api/skills/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId }),
      });
      fetchMarketplace();
    } catch (error) {
      console.error("Failed to install:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 px-6 py-4">
        <Zap className="h-8 w-8 text-teal-400" />
        <h1 className="text-2xl font-bold text-white">Skills Marketplace</h1>
      </div>

      <div className="flex flex-1 flex-col px-6 py-4">
        {/* Search */}
        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border bg-muted pl-10 text-white"
            />
          </div>
        </div>

        {/* Repos Grid */}
        <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="text-muted-foreground">Loading marketplace...</p>
          ) : repos.map((repo) => (
            <Card key={repo.id} className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Puzzle className="h-5 w-5 text-teal-400" />
                  {repo.name}
                </CardTitle>
                <CardDescription>by {repo.owner}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-white">{repo.description}</p>
                <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{repo.skills} skills</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {repo.rating}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => installRepo(repo.id)}
                >
                  <Download className="mr-2 h-3 w-3" />
                  Install
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
