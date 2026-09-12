"use client";

import { useState } from "react";

export default function Home() {
  return (
    <main className="flex h-screen bg-background overflow-hidden">
      <div className="flex-1 p-8">
        <h1 className="text-4xl font-bold text-center text-primary">X-Copilot Web</h1>
        <p className="text-center text-muted-foreground mt-4">
          Web interface is working.
        </p>
      </div>
    </main>
  );
}
