export interface JsonErrorInfo {
  message: string;
  thaiHint: string;
  line: number | null;
  column: number | null;
  position: number | null;
}

export interface AutoFixResult {
  fixed: string | null;
  success: boolean;
  fixesApplied: string[];
}

export function parseJsonError(errorMsg: string, jsonText: string): JsonErrorInfo {
  if (!errorMsg) {
    return { message: "", thaiHint: "", line: null, column: null, position: null };
  }

  let line: number | null = null;
  let col: number | null = null;
  let pos: number | null = null;

  // 1. Line & Column match (e.g. line 7 column 5)
  const lineColMatch = errorMsg.match(/line\s*(\d+)[,\s]+col(?:umn)?\s*(\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10);
    col = parseInt(lineColMatch[2], 10);
  }

  // 2. Position match (e.g. position 135)
  const posMatch = errorMsg.match(/position\s*(\d+)/i);
  if (posMatch) {
    pos = parseInt(posMatch[1], 10);
  }

  // 3. Coordinate match (e.g. 7:5)
  if (line === null) {
    const coordMatch = errorMsg.match(/(\d+):(\d+)/);
    if (coordMatch) {
      line = parseInt(coordMatch[1], 10);
      col = parseInt(coordMatch[2], 10);
    }
  }

  // 4. Line only match (e.g. line 7)
  if (line === null) {
    const lineOnlyMatch = errorMsg.match(/line\s*(\d+)/i);
    if (lineOnlyMatch) {
      line = parseInt(lineOnlyMatch[1], 10);
    }
  }

  // If position is found, derive line and col
  if (pos !== null && pos >= 0 && jsonText) {
    const textBefore = jsonText.slice(0, pos);
    const lines = textBefore.split("\n");
    const calculatedLine = lines.length;
    const calculatedCol = lines[lines.length - 1].length + 1;

    if (line === null) line = calculatedLine;
    if (col === null) col = calculatedCol;
  }

  // If line & col are known but position is not, compute position
  if (pos === null && line !== null && jsonText) {
    const lines = jsonText.split("\n");
    let offset = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }
    offset += (col ? col - 1 : 0);
    pos = Math.min(offset, jsonText.length);
  }

  // Thai hint
  let thaiHint = "โปรดตรวจสอบความถูกต้องของไวยากรณ์ JSON";
  const lower = errorMsg.toLowerCase();

  if (lower.includes("expected ','") || lower.includes("expected colon") || lower.includes("after property value")) {
    thaiHint = "อาจลืมใส่เครื่องหมายจุลภาค (,) คั่นระหว่างฟิลด์ หรือลืมใส่เครื่องหมายโคลอน (:)";
  } else if (lower.includes("unexpected token }") || lower.includes("unexpected token ]")) {
    thaiHint = "อาจมีเครื่องหมายจุลภาค (,) เกินที่ตัวสุดท้ายก่อนปิดวงเล็บ (Trailing Comma) หรือวงเล็บปิดไม่ตรงคู่";
  } else if (lower.includes("unexpected token '") || lower.includes("single quote")) {
    thaiHint = "JSON รองรับเฉพาะเครื่องหมายคำพูดคู่ (\") เท่านั้น ห้ามใช้ Single quote";
  } else if (lower.includes("expected double-quoted") || lower.includes("unquoted")) {
    thaiHint = "ชื่อ Property (Key) ต้องครอบด้วยเครื่องหมายคำพูดคู่ (\") เสมอ";
  } else if (lower.includes("unexpected end of json") || lower.includes("unexpected end of data")) {
    thaiHint = "ข้อมูล JSON ยังไม่สมบูรณ์ หรือลืมปิดวงเล็บปีกกา/ก้ามปู (}, ])";
  } else if (lower.includes("unexpected token <")) {
    thaiHint = "ข้อความนี้ดูเหมือน HTML/XML ไม่ใช่ JSON ที่ถูกต้อง";
  } else if (line !== null) {
    thaiHint = "พบข้อผิดพลาดที่บรรทัด " + line + (col ? " คอลัมน์ " + col : "");
  }

  return {
    message: errorMsg,
    thaiHint,
    line,
    column: col,
    position: pos,
  };
}

/**
 * Inserts missing commas between adjacent properties or array elements.
 */
function insertMissingCommas(text: string): { result: string; changed: boolean } {
  const lines = text.split("\n");
  const resultLines: string[] = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Find next non-empty, non-comment line
    let nextTrimmed = "";
    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j].trim();
      if (candidate && !candidate.startsWith("//") && !candidate.startsWith("/*")) {
        nextTrimmed = candidate;
        break;
      }
    }

    let processedLine = line;

    if (trimmed && nextTrimmed) {
      // Check if current line ends with a value and lacks a comma
      const isEndingValue =
        trimmed.endsWith('"') ||
        trimmed.endsWith("}") ||
        trimmed.endsWith("]") ||
        /\b(true|false|null|\d+(\.\d+)?)\s*$/.test(trimmed);

      const lacksComma =
        !trimmed.endsWith(",") &&
        !trimmed.endsWith("{") &&
        !trimmed.endsWith("[") &&
        !trimmed.endsWith(":");

      // Next line starts with a new property or array item
      const nextStartsNewPropertyOrItem =
        /^"([^"\\]|\\.)*"\s*:/.test(nextTrimmed) ||
        /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(nextTrimmed) ||
        /^[{[]/.test(nextTrimmed) ||
        /^"([^"\\]|\\.)*"/.test(nextTrimmed) ||
        /^(true|false|null|\d+)/.test(nextTrimmed);

      // Avoid adding comma if next line is closing symbol } or ]
      const nextIsClosing = /^[}\]]/.test(nextTrimmed);

      if (isEndingValue && lacksComma && nextStartsNewPropertyOrItem && !nextIsClosing) {
        processedLine = line + ",";
        changed = true;
      }
    }

    resultLines.push(processedLine);
  }

  return { result: resultLines.join("\n"), changed };
}

/**
 * Closes unclosed braces `{}` and brackets `[]` at the end of the JSON string.
 */
function completeMissingBrackets(text: string): { result: string; changed: boolean } {
  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        stack.push("}");
      } else if (ch === "[") {
        stack.push("]");
      } else if (ch === "}") {
        if (stack.length > 0 && stack[stack.length - 1] === "}") {
          stack.pop();
        }
      } else if (ch === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === "]") {
          stack.pop();
        }
      }
    }
  }

  if (stack.length === 0 && !inString) {
    return { result: text, changed: false };
  }

  let result = text;
  if (inString) {
    result += '"';
  }

  // Remove any trailing comma before closing brackets
  result = result.trimEnd().replace(/,\s*$/, "");

  while (stack.length > 0) {
    const closing = stack.pop()!;
    result += "\n" + closing;
  }

  return { result, changed: true };
}

/**
 * Attempts to automatically fix confident and deterministic JSON syntax errors:
 * 1. Missing closing braces / brackets (`}` and `]`)
 * 2. Missing commas between properties or array items
 * 3. Trailing commas before `}` or `]`
 * 4. Single quotes instead of double quotes
 * 5. Unquoted object keys
 * 6. Stripping JavaScript-style comments
 *
 * GUARANTEE: Only returns success: true if the resulting output strictly passes JSON.parse().
 * If there is any ambiguity or it still fails to parse, it will return success: false without touching user code.
 */
export function attemptFixJson(raw: string): AutoFixResult {
  if (!raw || !raw.trim()) {
    return { fixed: null, success: false, fixesApplied: [] };
  }

  // If already valid, format nicely
  try {
    const parsed = JSON.parse(raw);
    return { fixed: JSON.stringify(parsed, null, 2), success: true, fixesApplied: [] };
  } catch {
    // Proceed to deterministic repair pipeline
  }

  const fixesApplied: string[] = [];
  let text = raw;

  // Step 1: Remove comments
  if (/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/m.test(text)) {
    text = text.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, "$1");
    fixesApplied.push("ลบคอมเมนต์ (Removed JS comments)");
  }

  // Step 2: Replace single-quoted strings & keys
  if (/'((?:\\.|[^'])*)'/.test(text)) {
    text = text.replace(/'((?:\\.|[^'])*)'/g, (_, content: string) => {
      const unescaped = content.replace(/\\'/g, "'");
      const escaped = unescaped.replace(/"/g, '\\"');
      return '"' + escaped + '"';
    });
    fixesApplied.push("เปลี่ยน Single Quote เป็น Double Quote");
  }

  // Step 3: Fix unquoted property keys
  if (/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.test(text)) {
    text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    fixesApplied.push("ใส่เครื่องหมายคำพูดที่ Key");
  }

  // Step 4: Insert missing commas between lines/properties/elements
  const commaFix = insertMissingCommas(text);
  if (commaFix.changed) {
    text = commaFix.result;
    fixesApplied.push("เติมลูกน้ำที่ขาด (Added missing commas)");
  }

  // Step 5: Remove trailing commas before closing braces/brackets
  if (/,\s*([}\]])/.test(text)) {
    text = text.replace(/,\s*([}\]])/g, "$1");
    fixesApplied.push("ลบลูกน้ำส่วนเกิน (Removed trailing commas)");
  }

  // Step 6: Complete missing closing braces/brackets at the end
  const bracketFix = completeMissingBrackets(text);
  if (bracketFix.changed) {
    text = bracketFix.result;
    fixesApplied.push("ปิดวงเล็บปีกกา/ก้ามปูให้ครบ (Closed missing braces/brackets)");
  }

  // Strict verification check: Must be 100% valid JSON
  try {
    const parsed = JSON.parse(text);
    return {
      fixed: JSON.stringify(parsed, null, 2),
      success: true,
      fixesApplied,
    };
  } catch {
    // If still failing, do NOT guess or corrupt user code
    return {
      fixed: null,
      success: false,
      fixesApplied: [],
    };
  }
}
