import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Minimize2,
  ArrowDownAZ,
  Copy,
  Check,
  Download,
  Trash2,
  AlertCircle,
  FileCode2,
  Target,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { parseJsonError, attemptFixJson } from '../../utils/jsonErrorParser';

export const JsonFormatterTool: React.FC = () => {
  const [input, setInput] = useState<string>(`{
  "project": "DevTools Hub",
  "version": "1.0.0",
  "author": {
    "name": "Nareekarn",
    "role": "Flutter Architect"
  },
  "tags": ["flutter", "dart", "clean-code", "sonarqube"],
  "features": {
    "zero_deps": true,
    "rating": 5.0
  }
}`);
  const [indentSize, setIndentSize] = useState<number>(2);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, selected: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Compute stats and error reactively
  const { isValid, keyCount, error } = useMemo(() => {
    if (!input.trim()) {
      return { isValid: false, keyCount: 0, error: null };
    }
    try {
      const p = JSON.parse(input);
      let count = 0;
      const countKeys = (o: unknown) => {
        if (typeof o === 'object' && o !== null) {
          if (Array.isArray(o)) {
            o.forEach(countKeys);
          } else {
            count += Object.keys(o).length;
            Object.values(o).forEach(countKeys);
          }
        }
      };
      countKeys(p);
      return { isValid: true, keyCount: count, error: null };
    } catch (err: unknown) {
      const e = err as Error;
      return { isValid: false, keyCount: 0, error: e.message };
    }
  }, [input]);

  const errorInfo = useMemo(() => {
    return error ? parseJsonError(error, input) : null;
  }, [error, input]);

  const autoFixResult = useMemo(() => {
    if (!error) return null;
    return attemptFixJson(input);
  }, [error, input]);

  const lines = useMemo(() => {
    return input ? input.split('\n') : [''];
  }, [input]);

  const lineCount = lines.length;
  const byteCount = new Blob([input]).size;

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleGutterWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop += e.deltaY;
      if (gutterRef.current) {
        gutterRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  };

  const updateCursorPosition = (el: HTMLTextAreaElement) => {
    const selStart = el.selectionStart || 0;
    const selEnd = el.selectionEnd || 0;
    const textBefore = el.value.slice(0, selStart);
    const lineList = textBefore.split('\n');
    const currentLine = lineList.length;
    const currentCol = lineList[lineList.length - 1].length + 1;
    const selected = Math.abs(selEnd - selStart);

    setCursorPos({ line: currentLine, col: currentCol, selected });
  };

  const jumpToLine = (targetLine: number, targetCol = 1) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    let charOffset = 0;

    for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
      charOffset += lines[i].length + 1;
    }
    charOffset += Math.max(0, targetCol - 1);
    charOffset = Math.min(charOffset, input.length);

    textarea.focus();
    textarea.setSelectionRange(charOffset, charOffset);

    const lineHeightPx = 24;
    const maxScroll = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
    if (maxScroll > 0) {
      const targetScroll = Math.min(maxScroll, Math.max(0, (targetLine - 3) * lineHeightPx));
      textarea.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
      if (gutterRef.current) {
        gutterRef.current.scrollTop = targetScroll;
      }
    } else {
      textarea.scrollTop = 0;
      if (gutterRef.current) {
        gutterRef.current.scrollTop = 0;
      }
    }

    updateCursorPosition(textarea);
  };

  const formatJson = (space: number) => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, space));
      if (textareaRef.current) textareaRef.current.scrollTop = 0;
      if (gutterRef.current) gutterRef.current.scrollTop = 0;
    } catch {
      if (autoFixResult?.success && autoFixResult.fixed) {
        setInput(autoFixResult.fixed);
        if (textareaRef.current) textareaRef.current.scrollTop = 0;
        if (gutterRef.current) gutterRef.current.scrollTop = 0;
      }
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
      if (textareaRef.current) textareaRef.current.scrollTop = 0;
      if (gutterRef.current) gutterRef.current.scrollTop = 0;
    } catch {
      // keep as is
    }
  };

  const sortKeysRecursively = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sortKeysRecursively);
    } else if (obj !== null && typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      for (const key of keys) {
        sorted[key] = sortKeysRecursively((obj as Record<string, unknown>)[key]);
      }
      return sorted;
    }
    return obj;
  };

  const sortJsonKeys = () => {
    try {
      const parsed = JSON.parse(input);
      const sorted = sortKeysRecursively(parsed);
      setInput(JSON.stringify(sorted, null, indentSize));
      if (textareaRef.current) textareaRef.current.scrollTop = 0;
      if (gutterRef.current) gutterRef.current.scrollTop = 0;
    } catch {
      // keep as is
    }
  };

  const handleCopy = async () => {
    if (!input) return;
    await navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([input], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyAutoFix = () => {
    if (autoFixResult?.success && autoFixResult.fixed) {
      setInput(autoFixResult.fixed);
      if (textareaRef.current) textareaRef.current.scrollTop = 0;
      if (gutterRef.current) gutterRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      const maxScroll = textareaRef.current.scrollHeight - textareaRef.current.clientHeight;
      if (maxScroll <= 0 && textareaRef.current.scrollTop > 0) {
        textareaRef.current.scrollTop = 0;
      }
      if (gutterRef.current) {
        gutterRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  }, [input, lines.length]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm dark:shadow-xl transition-colors duration-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <FileCode2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              JSON Formatter &amp; Validator
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Fast &amp; Offline
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            จัดรูปแบบให้สวยงาม ตรวจสอบความถูกต้อง เรียง Keys และระบุตำแหน่งข้อผิดพลาดแบบ Real-time
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => {
                setIndentSize(2);
                formatJson(2);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                indentSize === 2
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              2 Spaces
            </button>
            <button
              onClick={() => {
                setIndentSize(4);
                formatJson(4);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                indentSize === 4
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              4 Spaces
            </button>
          </div>

          <button
            onClick={sortJsonKeys}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
            title="Sort Object Keys Alphabetically"
          >
            <ArrowDownAZ className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Sort Keys</span>
          </button>

          <button
            onClick={minifyJson}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
            title="Minify JSON (Remove Whitespace)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Minify</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors"
            title="Download formatted.json"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setInput('')}
            className="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor & Metrics */}
      <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden flex flex-col transition-colors">
        {/* Top Status Bar */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b text-xs font-mono select-none transition-colors ${
            isValid
              ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              : 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span
              className={`flex items-center gap-1.5 font-bold ${
                isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isValid ? 'bg-emerald-500' : 'bg-rose-500 ring-4 ring-rose-500/20 animate-pulse'
                }`}
              />
              {isValid ? 'Valid JSON' : 'Invalid JSON (Syntax Error)'}
            </span>

            {!isValid && errorInfo && errorInfo.line !== null && (
              <button
                onClick={() => jumpToLine(errorInfo.line!, errorInfo.column || 1)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                title="คลิกเพื่อเลื่อน Cursor ไปยังตำแหน่งที่ผิด"
              >
                <Target className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                บรรทัดที่ {errorInfo.line}
                {errorInfo.column !== null ? `:${errorInfo.column}` : ''}
              </button>
            )}

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-600 dark:text-slate-400">{lineCount} lines</span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-600 dark:text-slate-400">
              {isValid ? `${keyCount} total keys` : 'Invalid Structure'}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-600 dark:text-slate-400">{(byteCount / 1024).toFixed(2)} KB</span>
          </div>

          {!isValid && autoFixResult?.success && (
            <button
              onClick={handleApplyAutoFix}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="ตรวจพบไวยากรณ์ที่ซ่อมแซมได้อัตโนมัติ"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ซ่อม Auto-Fix</span>
            </button>
          )}
        </div>

        {/* Text Area with Line Gutter */}
        <div className="relative flex h-[520px] bg-slate-50/70 dark:bg-slate-950/70 overflow-hidden font-mono">
          {/* Line Gutter */}
          <div
            ref={gutterRef}
            onWheel={handleGutterWheel}
            className="w-12 sm:w-14 bg-slate-100/90 dark:bg-slate-900/90 py-3.5 font-mono text-xs select-none border-r border-slate-200 dark:border-slate-800 overflow-hidden shrink-0"
            aria-hidden="true"
          >
            <div
              style={{
                minHeight: `${lines.length * 24 + 28}px`,
                height: textareaRef.current?.scrollHeight || 'auto',
              }}
            >
              {lines.map((_, idx) => {
                const lineNum = idx + 1;
                const isErrorLine = errorInfo?.line === lineNum;
                const isCursorLine = cursorPos.line === lineNum;

                return (
                  <div
                    key={lineNum}
                    onClick={() => jumpToLine(lineNum)}
                    className={`h-6 leading-6 px-1.5 text-right cursor-pointer flex items-center justify-end gap-1 transition-colors ${
                      isErrorLine
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold border-l-2 border-rose-500 pl-1'
                        : isCursorLine
                        ? 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-medium'
                        : 'text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    title={
                      isErrorLine
                        ? `Error on line ${lineNum}: ${errorInfo?.message}`
                        : `Click to go to line ${lineNum}`
                    }
                  >
                    {isErrorLine && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                    <span className="text-[11px] sm:text-xs">{lineNum}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              updateCursorPosition(e.target);
            }}
            onKeyUp={(e) => updateCursorPosition(e.currentTarget)}
            onClick={(e) => updateCursorPosition(e.currentTarget)}
            onSelect={(e) => updateCursorPosition(e.currentTarget)}
            onScroll={handleScroll}
            placeholder="วาง JSON ที่ต้องการจัดรูปแบบที่นี่..."
            spellCheck={false}
            style={{ lineHeight: '24px' }}
            className="flex-1 w-full h-full py-3.5 px-3 bg-transparent text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm leading-6 resize-none focus:outline-none selection:bg-indigo-500/30 overflow-auto whitespace-pre"
          />
        </div>

        {/* Docked Status / Error Bar */}
        {error && errorInfo ? (
          <div className="px-4 py-3 bg-rose-50 dark:bg-rose-950/90 border-t border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Error Details */}
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-rose-800 dark:text-rose-200">
                      JSON Syntax Error
                    </span>
                    {errorInfo.line !== null && (
                      <button
                        onClick={() => jumpToLine(errorInfo.line!, errorInfo.column || 1)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700/60 text-[11px] font-mono font-semibold transition-colors"
                        title="คลิกเพื่อเลื่อน Cursor ไปยังบรรทัดนี้"
                      >
                        <Target className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        บรรทัดที่ {errorInfo.line}
                        {errorInfo.column !== null ? `:${errorInfo.column}` : ''}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                    {errorInfo.thaiHint}
                  </p>
                  <p
                    className="text-[11px] font-mono text-rose-600 dark:text-rose-400/90 mt-0.5 truncate"
                    title={errorInfo.message}
                  >
                    {errorInfo.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {errorInfo.line !== null && (
                  <button
                    onClick={() => jumpToLine(errorInfo.line!, errorInfo.column || 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>ไปที่บรรทัดผิด</span>
                  </button>
                )}

                {autoFixResult?.success && (
                  <button
                    onClick={handleApplyAutoFix}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
                    title={
                      autoFixResult.fixesApplied.length > 0
                        ? `ตรวจพบสิ่งที่ซ่อมแซมได้อัตโนมัติ:\n• ${autoFixResult.fixesApplied.join('\n• ')}`
                        : 'ซ่อมแซมไวยากรณ์ JSON อัตโนมัติ'
                    }
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ซ่อม JSON อัตโนมัติ</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono select-none">
            <div className="flex items-center gap-3">
              <span>
                Ln {cursorPos.line}, Col {cursorPos.col}
              </span>
              {cursorPos.selected > 0 && (
                <span className="text-indigo-600 dark:text-indigo-400">
                  ({cursorPos.selected} selected)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Valid JSON</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
