"use client";
import { ReactNode, useCallback, useState } from "react";
import { ThreadList } from "./ThreadList";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { MCPServerList } from "./MCPServerList";
import { PersonaSidePanel } from "./PersonaSidePanel";
import { KeyManagement } from "./KeyManagement";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPersonaPanelOpen, setPersonaPanelOpen] = useState(true);
  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const togglePersonaPanel = useCallback(() => setPersonaPanelOpen((v) => !v), []);
  const openMCPConfig = useCallback(() => setShowMCPConfig(true), []);
  const closeMCPConfig = useCallback(() => setShowMCPConfig(false), []);

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar}>
        <ThreadList onOpenMCPConfig={openMCPConfig} onOpenKeys={() => setShowKeys(true)} />
      </Sidebar>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col bg-gray-50 transition-colors dark:bg-[#0d0f14]">
        <div className="z-10">
          <Header toggleSidebar={toggleSidebar} />
        </div>

        {/* Main content */}
        <div className="relative h-[calc(100vh-4rem)] flex-1">{children}</div>
      </div>

      <PersonaSidePanel isOpen={isPersonaPanelOpen} onToggle={togglePersonaPanel} />

      {/* MCP Configuration Modal */}
      <MCPServerList isOpen={showMCPConfig} onClose={closeMCPConfig} />
      {showKeys && <KeyManagement onClose={() => setShowKeys(false)} />}
    </div>
  );
}
