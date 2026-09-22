import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Minimize2,
  Trash2,
  Copy,
  Check,
  Upload,
  AlertCircle,
  FileCode,
  AlignLeft,
  Sparkles,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { parseJsonError, attemptFixJson } from '../utils/jsonErrorParser';

interface JsonEditorProps {
  value: string;
  onChange: (val: string) => void;
  error: string | null;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  error,
}) => {
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, selected: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Parse error details (line, column, character position, Thai hint)
  const errorInfo = useMemo(() => {
    return error ? parseJsonError(error, value) : null;
  }, [error, value]);

  // Check if auto-fix is available
  const autoFixResult = useMemo(() => {
    if (!error) return null;
    return attemptFixJson(value);
  }, [error, value]);

  // Lines split
  const lines = useMemo(() => {
    return value ? value.split('\n') : [''];
  }, [value]);

  const lineCount = lines.length;
  const byteCount = new Blob([value]).size;

  // Sync scroll between textarea and line gutter
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Update cursor position
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

  // Jump to specific line and column
  const jumpToLine = (targetLine: number, targetCol = 1) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    let charOffset = 0;

    for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
      charOffset += lines[i].length + 1; // +1 for \n
    }
    charOffset += Math.max(0, targetCol - 1);
    charOffset = Math.min(charOffset, value.length);

    textarea.focus();
    textarea.setSelectionRange(charOffset, charOffset);

    // Scroll line into view smoothly
    // Line height is 24px (leading-6)
    const lineHeightPx = 24;
    const targetScroll = Math.max(0, (targetLine - 4) * lineHeightPx);
    textarea.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });

    updateCursorPosition(textarea);
  };

  const handleBeautify = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // If broken, try autoFix
      if (autoFixResult?.success && autoFixResult.fixed) {
        onChange(autoFixResult.fixed);
      }
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed));
    } catch {
      // Keep as is if invalid
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        onChange(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyAutoFix = () => {
    if (autoFixResult?.success && autoFixResult.fixed) {
      onChange(autoFixResult.fixed);
    }
  };

  // Re-sync gutter scroll when lines count change
  useEffect(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [lines.length]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl overflow-hidden transition-colors">
      {/* Editor Header Toolbar */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b select-none transition-colors ${
          error
            ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <FileCode
            className={`w-4 h-4 ${
              error ? 'text-rose-600 dark:text-rose-400' : 'text-cyan-600 dark:text-cyan-400'
            }`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            JSON Input
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              error
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                error ? 'bg-rose-500 ring-2 ring-rose-400/40 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            {error ? 'Invalid JSON' : 'Valid JSON'}
          </span>

          {error && errorInfo && errorInfo.line !== null && (
            <button
              onClick={() => jumpToLine(errorInfo.line!, errorInfo.column || 1)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 text-[10px] font-semibold transition-colors cursor-pointer"
              title="คลิกเพื่อเลื่อน Cursor ไปยังบรรทัดที่ผิด"
            >
              <Target className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              บรรทัดที่ {errorInfo.line}
              {errorInfo.column !== null ? `:${errorInfo.column}` : ''}
            </button>
          )}

          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            ({lineCount} lines • {(byteCount / 1024).toFixed(1)} KB)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {error && autoFixResult?.success && (
            <button
              onClick={handleApplyAutoFix}
              className="flex items-center gap-1 px-2.5 py-1 mr-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="ซ่อมแซม JSON อัตโนมัติ"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ซ่อม Auto-Fix</span>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Upload JSON File"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleBeautify}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Beautify / Format JSON"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Format</span>
          </button>
          <button
            onClick={handleMinify}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Minify JSON"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            disabled={!value}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            title="Copy JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleClear}
            disabled={!value}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            title="Clear JSON"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body with Line Numbers Gutter */}
      <div className="relative flex-1 flex min-h-[440px] bg-slate-50/70 dark:bg-slate-950/70 overflow-hidden">
        {/* Line Gutter */}
        <div
          ref={gutterRef}
          className="w-11 sm:w-13 bg-slate-100/90 dark:bg-slate-900/90 py-3.5 font-mono text-xs select-none border-r border-slate-200 dark:border-slate-800 overflow-hidden shrink-0"
          aria-hidden="true"
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
                title={isErrorLine ? `Error on line ${lineNum}: ${errorInfo?.message}` : `Click to go to line ${lineNum}`}
              >
                {isErrorLine && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                )}
                <span className="text-[11px] sm:text-xs">{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            updateCursorPosition(e.target);
          }}
          onKeyUp={(e) => updateCursorPosition(e.currentTarget)}
          onClick={(e) => updateCursorPosition(e.currentTarget)}
          onSelect={(e) => updateCursorPosition(e.currentTarget)}
          onScroll={handleScroll}
          placeholder={`วาง JSON ของคุณที่นี่ หรือเลือก Preset ด้านบน...\n\n{\n  "user_id": 101,\n  "full_name": "Somchai Prasert",\n  "is_active": true\n}`}
          spellCheck={false}
          className="flex-1 w-full h-full py-3.5 px-3 bg-transparent text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm leading-6 resize-none focus:outline-none selection:bg-cyan-500/30 overflow-auto whitespace-pre"
        />
      </div>

      {/* Docked Status / Error Bar (Never overlays on top of textarea text) */}
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
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400/90 mt-0.5 truncate" title={errorInfo.message}>
                  {errorInfo.message}
                </p>
              </div>
            </div>

            {/* Action Buttons: Jump to Error & Auto-Fix */}
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
        /* Valid JSON / Idle Status Footer */
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono select-none">
          <div className="flex items-center gap-3">
            <span>
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
            {cursorPos.selected > 0 && (
              <span className="text-cyan-600 dark:text-cyan-400">
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
  );
};
