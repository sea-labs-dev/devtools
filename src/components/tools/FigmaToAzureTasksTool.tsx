import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  SlidersHorizontal,
  FileJson,
  FileSpreadsheet,
  Layers,
  ClipboardPaste,
  Kanban,
  CheckCircle2,
  ShoppingCart,
  Smartphone,
  BarChart3,
  ChevronDown,
  Tag,
  Database,
} from 'lucide-react';
import {
  parseFigmaCards,
  formatCardsToJson,
  formatCardsToAzureCsv,
  formatCardsToAzureApiJson,
  FigmaCardItem,
  FigmaParserOptions,
} from '../../generator/figmaCardParser';

interface SamplePresetItem {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  category: string;
  icon: React.FC<{ className?: string }>;
  accentColor: string;
  iconBg: string;
  prefix?: string;
  text: string;
}

const SAMPLE_PRESETS: SamplePresetItem[] = [
  {
    id: 'api_breederfarm',
    name: 'BreederFarm Feeding (API Tasks)',
    subtitle: 'Header Overview, Feeding Logic with "API :" Prefix',
    badge: '2 Tasks • 2.5 pts',
    category: 'API & Backend',
    icon: Database,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
    prefix: 'API :',
    text: `UI
BreederFarm\u00A0
Feeding
Header Overview





2
Function
BreederFarm\u00A0
Feeding





0.5`,
  },
  {
    id: 'ecommerce_sprint',
    name: 'E-Commerce & Checkout Flow',
    subtitle: 'Payment Selector, Apple Pay, Cart Engine',
    badge: '2 Tasks • 2.5 pts',
    category: 'E-Commerce',
    icon: ShoppingCart,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    prefix: '',
    text: `UI
Checkout Screen
Payment Gateway Selector
Apple Pay & Credit Card





2
Function
Cart Calculation
Discount Coupon Engine
VAT & Shipping Fee





0.5`,
  },
  {
    id: 'mobile_auth',
    name: 'Mobile Auth & Biometrics',
    subtitle: 'Login, Biometrics, JWT Keyring, FaceID',
    badge: '3 Tasks • 4.0 pts',
    category: 'Mobile / Flutter',
    icon: Smartphone,
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
    prefix: '',
    text: `UI
Login & Register Screen
Biometric Prompt


1
Function
JWT Refresh Token Flow
Secure Storage Keyring


2
Function
FaceID / Fingerprint Auth
Hardware Keystore


1`,
  },
  {
    id: 'analytics_dashboard',
    name: 'Analytics & Export System',
    subtitle: 'Sales Chart, Date Filters, Excel Export',
    badge: '3 Tasks • 4.0 pts',
    category: 'Full-Stack',
    icon: BarChart3,
    accentColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400',
    prefix: '',
    text: `UI
Sales Dashboard
Revenue Chart & Summary Cards


2
Function
Date Range Filter
Weekly & Monthly Aggregation


1.5
API
Export Data to Excel
Background Job Queue


0.5`,
  },
];

type OutputTab = 'json' | 'azure-csv' | 'table' | 'azure-api';

export const FigmaToAzureTasksTool: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SAMPLE_PRESETS[0].id);
  const [rawInput, setRawInput] = useState<string>(SAMPLE_PRESETS[0].text);
  const [activeTab, setActiveTab] = useState<OutputTab>('json');
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parser Options
  const [options, setOptions] = useState<FigmaParserOptions>({
    titleKey: 'title',
    effortKey: 'effort',
    extractType: false,
    defaultEffort: 1,
    prefix: '',
    suffix: '',
    workitemType: 'Task',
    defaultActivity: 'Development',
  });

  const selectedPreset = useMemo(() => {
    return SAMPLE_PRESETS.find((p) => p.id === selectedPresetId) || SAMPLE_PRESETS[0];
  }, [selectedPresetId]);

  // Parsed Cards State
  const cards: FigmaCardItem[] = useMemo(() => {
    return parseFigmaCards(rawInput, options);
  }, [rawInput, options]);

  // Statistics
  const totalTasks = cards.length;
  const totalEffort = useMemo(() => {
    return cards.reduce((sum, c) => sum + (c.effort || 0), 0);
  }, [cards]);
  const avgEffort = totalTasks > 0 ? (totalEffort / totalTasks).toFixed(2) : '0';

  // Generated Output Strings
  const generatedJson = useMemo(() => formatCardsToJson(cards, options), [cards, options]);
  const generatedAzureCsv = useMemo(() => formatCardsToAzureCsv(cards, options), [cards, options]);
  const generatedAzureApi = useMemo(() => formatCardsToAzureApiJson(cards, options), [cards, options]);

  const currentOutputContent = useMemo(() => {
    switch (activeTab) {
      case 'json':
        return generatedJson;
      case 'azure-csv':
        return generatedAzureCsv;
      case 'azure-api':
        return generatedAzureApi;
      case 'table':
        return generatedJson;
      default:
        return generatedJson;
    }
  }, [activeTab, generatedJson, generatedAzureCsv, generatedAzureApi]);

  const handleCopy = async () => {
    if (!currentOutputContent) return;
    await navigator.clipboard.writeText(currentOutputContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = 'tasks.json';
    let mime = 'application/json';
    let content = currentOutputContent;

    if (activeTab === 'azure-csv') {
      filename = 'azure-tasks.csv';
      mime = 'text/csv;charset=utf-8;';
    } else if (activeTab === 'azure-api') {
      filename = 'azure-devops-batch.json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRawInput(text);
    } catch {
      // ignore
    }
  };

  const handleSelectPreset = (preset: SamplePresetItem) => {
    setSelectedPresetId(preset.id);
    setRawInput(preset.text);
    if (preset.prefix !== undefined) {
      setOptions((prev) => ({ ...prev, prefix: preset.prefix || '' }));
    }
    setIsDropdownOpen(false);
  };

  const SelectedIcon = selectedPreset.icon;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 shadow-sm dark:shadow-xl transition-colors duration-200">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Kanban className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Figma Cards to Azure &amp; JSON Tasks</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                Sprint Planning Ready
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            แปลงข้อความที่ Copy มาจากการ์ด Figma/FigJam ให้กลายเป็น JSON และ Azure DevOps Tasks พร้อมสกัด Title และ Effort อัตโนมัติ
          </p>
        </div>

        {/* Action Controls Toolbar (Full-width responsive toolbar without broken wrapping) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Custom Elegant Presets Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="h-10 flex items-center gap-2.5 px-3 bg-slate-50 dark:bg-slate-950/90 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/60 shadow-sm dark:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 group"
            >
              <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${selectedPreset.iconBg}`}>
                <SelectedIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none">
                  Preset
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                  {selectedPreset.name}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ml-0.5 shrink-0 ${
                  isDropdownOpen ? 'rotate-180 text-emerald-500 dark:text-emerald-400' : 'group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}
              />
            </button>

            {/* Dropdown Menu Popover */}
            {isDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-700/90 shadow-2xl shadow-slate-400/20 dark:shadow-black/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Template Presets</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                    {SAMPLE_PRESETS.length} Examples
                  </span>
                </div>

                <div className="space-y-1">
                  {SAMPLE_PRESETS.map((p) => {
                    const IconComponent = p.icon;
                    const isSelected = p.id === selectedPresetId;

                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-slate-100 shadow-sm'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${p.iconBg}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200 dark:border-slate-700/50">
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            {p.subtitle}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-1.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`h-10 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold border transition-all ${
              showOptions
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Options</span>
          </button>

          <button
            onClick={handleCopy}
            className="h-10 flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Output'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="h-10 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center"
            title="Download Output File"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Options Collapse Drawer */}
      {showOptions && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md animate-in fade-in duration-200 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Task Extraction &amp; Field Customization
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">ปรับแต่ง Schema ให้ตรงกับ Azure DevOps</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Title Key */}
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400 font-medium">JSON Title Key</label>
              <input
                type="text"
                value={options.titleKey}
                onChange={(e) => setOptions({ ...options, titleKey: e.target.value })}
                placeholder="title (default)"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Effort Key */}
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400 font-medium">JSON Effort Key</label>
              <input
                type="text"
                value={options.effortKey}
                onChange={(e) => setOptions({ ...options, effortKey: e.target.value })}
                placeholder="effort (default)"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Work Item Type */}
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400 font-medium">Work Item Type</label>
              <select
                value={options.workitemType}
                onChange={(e) => setOptions({ ...options, workitemType: e.target.value })}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="Task">Task</option>
                <option value="User Story">User Story</option>
                <option value="Bug">Bug</option>
                <option value="Feature">Feature</option>
              </select>
            </div>

            {/* Default Activity */}
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400 font-medium">Default Activity</label>
              <select
                value={options.defaultActivity}
                onChange={(e) => setOptions({ ...options, defaultActivity: e.target.value })}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="Development">Development</option>
                <option value="Design">Design</option>
                <option value="Testing">Testing</option>
                <option value="Documentation">Documentation</option>
              </select>
            </div>

            {/* Prefix */}
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400 font-medium">Prepend Prefix (e.g. [Sprint 1])</label>
              <input
                type="text"
                value={options.prefix}
                onChange={(e) => setOptions({ ...options, prefix: e.target.value })}
                placeholder="[Sprint 1]"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Extract Type Toggle */}
            <div className="space-y-1 sm:col-span-2 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 py-1">
                <input
                  type="checkbox"
                  checked={options.extractType}
                  onChange={(e) => setOptions({ ...options, extractType: e.target.checked })}
                  className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4"
                />
                <span>แยกประเภท (`UI`, `Function`, `API`) ลงใน key <code>type</code> ใน JSON</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm transition-colors">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Tasks</div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{totalTasks} Tasks</div>
          </div>
          <Layers className="w-7 h-7 text-emerald-500/20 dark:text-emerald-400/30" />
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm transition-colors">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Effort / Points</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totalEffort} pts</div>
          </div>
          <Sparkles className="w-7 h-7 text-emerald-500/20 dark:text-emerald-400/30" />
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm transition-colors">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Avg Effort / Task</div>
            <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-0.5">{avgEffort} pts</div>
          </div>
          <Kanban className="w-7 h-7 text-cyan-500/20 dark:text-cyan-400/30" />
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm transition-colors">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Est. Hours (1pt = 6h)</div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{totalEffort * 6} hrs</div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-amber-500/20 dark:text-amber-400/30" />
        </div>
      </div>

      {/* Task Tag & Prefix Quick Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            คำนำหน้าชื่อ Task (Prefix):
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: 'None', val: '' },
              { label: '⚡ API :', val: 'API :' },
              { label: '📱 Mobile :', val: 'Mobile :' },
              { label: '🌐 Web :', val: 'Web :' },
              { label: '🛠️ BE :', val: 'BE :' },
              { label: '🎨 FE :', val: 'FE :' },
            ].map((item) => {
              const isSelected = (options.prefix || '').trim() === item.val.trim();
              return (
                <button
                  key={item.label}
                  onClick={() => setOptions((prev) => ({ ...prev, prefix: item.val }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">กำหนดเอง (Custom):</span>
          <input
            type="text"
            value={options.prefix || ''}
            onChange={(e) => setOptions((prev) => ({ ...prev, prefix: e.target.value }))}
            placeholder="เช่น [Sprint 1] หรือ API :"
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Dual-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Raw Figma Input */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden flex flex-col transition-colors">
          <div className="px-3 sm:px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between min-h-[48px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Raw Figma Text Input</span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handlePasteFromClipboard}
                className="h-8 flex items-center gap-1.5 px-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                title="Paste from clipboard"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Paste</span>
              </button>
              <button
                onClick={() => setRawInput('')}
                className="h-8 w-8 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center shadow-xs"
                title="Clear input"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50">
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="วางข้อความที่ Copy มาจากการ์ดใน Figma / FigJam ที่นี่...

ตัวอย่าง:
UI
Checkout Screen
Payment Gateway Selector
Apple Pay & Credit Card

2
Function
Cart Calculation
Discount Coupon Engine
VAT & Shipping Fee

0.5"
              spellCheck={false}
              rows={18}
              className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y shadow-xs"
            />
          </div>

          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>{rawInput ? rawInput.split('\n').length : 0} lines</span>
            <span>Auto-parser: Real-time</span>
          </div>
        </div>

        {/* Right Column: Output Viewer */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden flex flex-col transition-colors">
          {/* Tabs Navigation & Action Toolbar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-2 min-h-[48px]">
            {/* Tabs List */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0 flex-1 no-scrollbar">
              <button
                onClick={() => setActiveTab('json')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all inline-flex items-center gap-1.5 ${
                  activeTab === 'json'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>

              <button
                onClick={() => setActiveTab('table')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all inline-flex items-center gap-1.5 ${
                  activeTab === 'table'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Visual Cards ({totalTasks})</span>
              </button>

              <button
                onClick={() => setActiveTab('azure-csv')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all inline-flex items-center gap-1.5 ${
                  activeTab === 'azure-csv'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Azure CSV</span>
              </button>

              <button
                onClick={() => setActiveTab('azure-api')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all inline-flex items-center gap-1.5 ${
                  activeTab === 'azure-api'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Azure API</span>
              </button>
            </div>

            {/* Quick Action Controls on Top Right */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleCopy}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                title="Copy output content"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-300 dark:border-slate-700/60 inline-flex items-center justify-center flex-shrink-0 shadow-sm"
                title="Download output file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-950/60 min-h-[460px]">
            {activeTab === 'table' ? (
              /* Visual Cards & Interactive Table */
              <div className="space-y-3">
                {cards.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs">
                    ไม่มีการ์ดที่ถูกตรวจพบ กรุณาวางข้อความ Figma ในช่องด้านซ้าย
                  </div>
                ) : (
                  cards.map((card, idx) => (
                    <div
                      key={card.id || idx}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                          {idx + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {card.type && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  card.type === 'UI'
                                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20'
                                    : card.type === 'Function'
                                    ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20'
                                    : card.type === 'API'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                } border`}
                              >
                                {card.type}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{card.activity}</span>
                          </div>

                          <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
                            {card.title}
                          </div>
                        </div>
                      </div>

                      {/* Effort Pill */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-black flex items-center gap-1 shadow-xs">
                          <span>{card.effort}</span>
                          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-500/70 font-sans">pts</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Code / Text Output Display */
              <div className="relative h-full">
                <pre className="p-4 bg-slate-900 dark:bg-slate-950 text-emerald-300 dark:text-emerald-300 font-mono text-xs sm:text-sm rounded-xl border border-slate-800/90 overflow-x-auto leading-relaxed max-h-[500px] shadow-sm">
                  {currentOutputContent}
                </pre>
              </div>
            )}
          </div>

          {/* Footer Guide */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 transition-colors">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">💡 How to use in Azure DevOps:</span>
            <span>Boards ➡️ Work Items ➡️ Import Work Items ➡️ เลือกไฟล์ CSV</span>
          </div>
        </div>
      </div>
    </div>
  );
};
