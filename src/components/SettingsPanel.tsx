import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { ModelConfiguration } from "./ModelConfiguration";
import { useMCPTools } from "@/hooks/useMCPTools";

interface SettingsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  provider: string;
  setProvider: (provider: string) => void;
  model: string;
  setModel: (model: string) => void;
}

export const SettingsPanel = ({
  isExpanded,
  onToggle,
  provider,
  setProvider,
  model,
  setModel,
}: SettingsPanelProps) => {
  const { data: mcpToolsData } = useMCPTools();
  return (
    <div className="border-b border-gray-200/80 dark:border-white/10">
      {/* Settings Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-white/5"
        aria-expanded={isExpanded}
        aria-label="Toggle settings panel"
      >
        <div className="flex min-w-0 items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <Settings className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">Settings</span>
          {!isExpanded && (
            <>
              <span className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                {provider} / {model}
              </span>
              {(mcpToolsData?.totalCount ?? 0) > 0 && (
                <span className="hidden text-[11px] text-gray-500 sm:inline dark:text-gray-400">
                  - {mcpToolsData?.totalCount ?? 0} tools available
                </span>
              )}
            </>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Settings Content */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 px-4 pb-3 duration-200">
          <div className="space-y-3">
            {/* Model Configuration */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Model
              </label>
              <ModelConfiguration
                provider={provider}
                setProvider={setProvider}
                model={model}
                setModel={setModel}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
