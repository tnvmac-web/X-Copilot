"use client";

import { useState } from "react";
import { FolderPlus, FolderOpen, Plus, ChevronRight, FileText, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authHeaders } from "@/lib/api-client";

interface Project {
  id: string;
  name: string;
  path: string;
  lastModified: string;
  description: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  const createProject = async () => {
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: newProjectName,
          path: newProjectPath,
          description: newProjectDesc,
        }),
      });
      setShowCreate(false);
      setNewProjectName("");
      setNewProjectPath("");
      setNewProjectDesc("");
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE", headers: authHeaders() });
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-8 w-8 text-teal-400" />
          <h1 className="text-2xl font-bold text-white">Projects</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="mx-6 mb-4 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-white">Create New Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-white">Project Name</label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My Project"
                className="border-border bg-muted text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white">Path</label>
              <Input
                value={newProjectPath}
                onChange={(e) => setNewProjectPath(e.target.value)}
                placeholder="/path/to/project"
                className="border-border bg-muted text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white">Description</label>
              <Input
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Brief description"
                className="border-border bg-muted text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createProject}>Create</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FolderPlus className="h-5 w-5 text-teal-400" />
                  {project.name}
                </CardTitle>
                <CardDescription>{project.path}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-white">{project.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>{project.lastModified}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm">
                    <ChevronRight className="mr-2 h-3 w-3" />
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProject(project.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
