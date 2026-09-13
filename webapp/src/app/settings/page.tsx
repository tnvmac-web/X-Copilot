"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Server, Database, Bell, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/lib/useWebSocket";

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_XCOPILOT_API_URL || "http://127.0.0.1:8000");
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState(false);
  const { status } = useWebSocket({ url: `${apiUrl}/api/ws` });

  const handleSave = async () => {
    try {
      window.localStorage.setItem("xcopilot_api_url", apiUrl);
      window.localStorage.setItem("xcopilot_username", username);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 px-6 py-4">
        <SettingsIcon className="h-8 w-8 text-teal-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* API Connection */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Server className="h-5 w-5 text-teal-400" />
              API Connection
            </CardTitle>
            <CardDescription>Connect to the X-Copilot backend server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">API URL</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://127.0.0.1:8000"
                className="border-border bg-muted text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                className="border-border bg-muted text-white"
              />
            </div>
            <Button onClick={handleSave}>
              {saved ? "Saved!" : "Save Configuration"}
            </Button>
          </CardContent>
        </Card>

        {/* WebSocket Status */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Database className="h-5 w-5 text-teal-400" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">
              WebSocket: {status === "open" ? "Connected" : "Disconnected"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
