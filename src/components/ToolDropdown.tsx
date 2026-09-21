import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  Check,
  Layers,
  Smartphone,
  Globe,
  Wrench,
  ShieldCheck,
  Zap,
  Palette,
  Code2,
  Brush,
  FileCode2,
  KeyRound,
  Kanban,
  ArrowRight,
  X,
} from 'lucide-react';
import { TOOLS_REGISTRY, ToolItem, PlatformType } from '../constants/toolsRegistry';

interface ToolDropdownProps {
  currentToolId: string | null;
  onSelectTool: (toolId: string) => void;
  onNavigateHome: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Palette: <Palette className="w-4 h-4" />,
  Code2: <Code2 className="w-4 h-4" />,
  Brush: <Brush className="w-4 h-4" />,
  FileCode2: <FileCode2 className="w-4 h-4" />,
  KeyRound: <KeyRound className="w-4 h-4" />,
  Kanban: <Kanban className="w-4 h-4" />,
};

export const ToolDropdown: React.FC<ToolDropdownProps> = ({
  currentToolId,
  onSelectTool,
  onNavigateHome,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentTool = useMemo(() => {
    return currentToolId ? TOOLS_REGISTRY.find((t) => t.id === currentToolId) : null;
  }, [currentToolId]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSelectedPlatform('all');
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter tools
  const filteredTools = useMemo(() => {
    return TOOLS_REGISTRY.filter((tool) => {
      const matchesPlatform = selectedPlatform === 'all' || tool.platform === selectedPlatform;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesPlatform;

      const matchesSearch =
        tool.title.toLowerCase().includes(query) ||
        tool.titleTh.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.features.some((f) => f.toLowerCase().includes(query)) ||
        (tool.badge && tool.badge.toLowerCase().includes(query));

      return matchesPlatform && matchesSearch;
    });
  }, [searchQuery, selectedPlatform]);

  const mobileTools = filteredTools.filter((t) => t.platform === 'mobile');
  const webTools = filteredTools.filter((t) => t.platform === 'web');
  const utilityTools = filteredTools.filter((t) => t.platform === 'shared');

  const handleSelect = (toolId: string) => {
    onSelectTool(toolId);
    setIsOpen(false);
  };

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'cyan':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'violet':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30';
      case 'amber':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
    }
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-cyan-500" />;
      case 'web':
        return <Globe className="w-3.5 h-3.5 text-violet-500" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const renderToolItem = (tool: ToolItem) => {
    const isSelected = currentToolId === tool.id;

    return (
      <button
        key={tool.id}
        onClick={() => handleSelect(tool.id)}
        className={`w-full group text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 ${
          isSelected
            ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 shadow-xs'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon Badge */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
              tool.platform === 'mobile'
                ? 'bg-cyan-100/70 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-700/60'
                : tool.platform === 'web'
                ? 'bg-violet-100/70 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700/60'
                : 'bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700/60'
            }`}
          >
            {ICON_MAP[tool.icon] || <Zap className="w-4 h-4" />}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                {tool.title}
              </span>
              {tool.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getBadgeClass(
                    tool.badgeColor
                  )}`}
                >
                  {tool.badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {tool.titleTh}
            </p>
          </div>
        </div>

        {/* Right Active / Hover Indicator */}
        <div className="shrink-0 flex items-center">
          {isSelected ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
              <Check className="w-3 h-3" />
              <span className="hidden sm:inline">Active</span>
            </span>
          ) : (
            <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          )}
        </div>
      </button>
    );
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all select-none ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-cyan-500/50 dark:border-cyan-400/50 ring-2 ring-cyan-500/20 shadow-md'
            : currentTool
            ? 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700/80 hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
            : 'bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-indigo-600/10 dark:from-cyan-500/20 dark:via-blue-500/20 dark:to-indigo-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/40 dark:border-cyan-500/30 hover:border-cyan-500 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2">
          {currentTool ? (
            <>
              <div className="flex items-center gap-1.5">
                {getPlatformIcon(currentTool.platform)}
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {currentTool.title}
                </span>
              </div>
              <span className="hidden md:inline text-[11px] text-slate-400">
                ({currentTool.titleTh})
              </span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="font-bold">เลือกเครื่องมือ (Switch Tool)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                10 Tools
              </span>
            </>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Flyout Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[480px] md:w-[560px] max-w-[95vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col transition-all animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเครื่องมือ (เช่น Flutter, JSON, JWT, Next.js)..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs select-none">
              <button
                onClick={() => setSelectedPlatform('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedPlatform === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ทั้งหมด ({TOOLS_REGISTRY.length})
              </button>
              <button
                onClick={() => setSelectedPlatform('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedPlatform === 'mobile'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-200/60 dark:border-cyan-800/40'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Mobile (4)</span>
              </button>
              <button
                onClick={() => setSelectedPlatform('web')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedPlatform === 'web'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200/60 dark:border-violet-800/40'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Next.js (3)</span>
              </button>
              <button
                onClick={() => setSelectedPlatform('shared')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedPlatform === 'shared'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/60 dark:border-indigo-800/40'
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>Utilities (3)</span>
              </button>
            </div>
          </div>

          {/* Tools List Body */}
          <div className="p-2.5 max-h-[420px] overflow-y-auto space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredTools.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold">ไม่พบเครื่องมือที่ตรงกับคำค้นหา</p>
                <p className="text-[11px] text-slate-400 mt-0.5">ลองค้นหาด้วยคำอื่น เช่น JSON, Dart, JWT</p>
              </div>
            ) : (
              <>
                {/* Mobile Section */}
                {mobileTools.length > 0 && (
                  <div className="space-y-1 pt-1.5 first:pt-0">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        Mobile (Flutter &amp; Dart)
                      </span>
                      <span className="text-[10px] font-mono opacity-60">
                        {mobileTools.length} tools
                      </span>
                    </div>
                    <div className="space-y-1">{mobileTools.map(renderToolItem)}</div>
                  </div>
                )}

                {/* Web Section */}
                {webTools.length > 0 && (
                  <div className="space-y-1 pt-2.5 first:pt-0">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        Web (Next.js &amp; React)
                      </span>
                      <span className="text-[10px] font-mono opacity-60">
                        {webTools.length} tools
                      </span>
                    </div>
                    <div className="space-y-1">{webTools.map(renderToolItem)}</div>
                  </div>
                )}

                {/* Shared Utilities Section */}
                {utilityTools.length > 0 && (
                  <div className="space-y-1 pt-2.5 first:pt-0">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5" />
                        General Utilities
                      </span>
                      <span className="text-[10px] font-mono opacity-60">
                        {utilityTools.length} tools
                      </span>
                    </div>
                    <div className="space-y-1">{utilityTools.map(renderToolItem)}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                onNavigateHome();
                setIsOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าแรก (Home)</span>
            </button>

            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              กด <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">Esc</kbd> เพื่อปิด
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
