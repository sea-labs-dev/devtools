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

interface Token {
  type:
    | 'LBRACE'
    | 'RBRACE'
    | 'LBRACKET'
    | 'RBRACKET'
    | 'COLON'
    | 'COMMA'
    | 'STRING'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'NULL'
    | 'SINGLE_STRING'
    | 'UNQUOTED_WORD'
    | 'COMMENT'
    | 'UNKNOWN';
  value: string;
  line: number;
  col: number;
  pos: number;
  endLine: number;
  endCol: number;
  endPos: number;
}

function tokenize(text: string): { tokens: Token[]; error: JsonErrorInfo | null } {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '\n') {
      line++;
      col = 1;
      i++;
      continue;
    }
    if (ch === '\r') {
      if (i + 1 < text.length && text[i + 1] === '\n') {
        i += 2;
        line++;
        col = 1;
        continue;
      }
      line++;
      col = 1;
      i++;
      continue;
    }

    if (ch === ' ' || ch === '\t') {
      col++;
      i++;
      continue;
    }

    // Skip Comments
    if (ch === '/' && i + 1 < text.length) {
      if (text[i + 1] === '/') {
        const startLine = line;
        const startCol = col;
        const startPos = i;
        while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
          i++;
          col++;
        }
        tokens.push({
          type: 'COMMENT',
          value: text.slice(startPos, i),
          line: startLine,
          col: startCol,
          pos: startPos,
          endLine: line,
          endCol: col,
          endPos: i,
        });
        continue;
      } else if (text[i + 1] === '*') {
        const startLine = line;
        const startCol = col;
        const startPos = i;
        i += 2;
        col += 2;
        while (i < text.length && !(text[i] === '*' && i + 1 < text.length && text[i + 1] === '/')) {
          if (text[i] === '\n') {
            line++;
            col = 1;
          } else {
            col++;
          }
          i++;
        }
        if (i < text.length) {
          i += 2;
          col += 2;
        }
        tokens.push({
          type: 'COMMENT',
          value: text.slice(startPos, i),
          line: startLine,
          col: startCol,
          pos: startPos,
          endLine: line,
          endCol: col,
          endPos: i,
        });
        continue;
      }
    }

    const startLine = line;
    const startCol = col;
    const startPos = i;

    if (ch === '{') {
      tokens.push({ type: 'LBRACE', value: '{', line, col, pos: i, endLine: line, endCol: col + 1, endPos: i + 1 });
      i++; col++; continue;
    }
    if (ch === '}') {
      tokens.push({ type: 'RBRACE', value: '}', line, col, pos: i, endLine: line, endCol: col + 1, endPos: i + 1 });
      i++; col++; continue;
    }
    if (ch === '[') {
      tokens.push({ type: 'LBRACKET', value: '[', line, col, pos: i, endLine: line, endCol: col + 1, endPos: i + 1 });
      i++; col++; continue;
    }
    if (ch === ']') {
      tokens.push({ type: 'RBRACKET', value: ']', line, col, pos: i, endLine: line, endCol: col + 1, endPos: i + 1 });
      i++; col++; continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'COLON', value: ':', line, col, pos: i, endLine: line, endCol: col + 1, endPos: i + 1 });
      i++; col++; continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', line, col, pos: i, endLine: line, endCol: col + 1, endPos: i + 1 });
      i++; col++; continue;
    }

    // Double-quoted string
    if (ch === '"') {
      i++; col++;
      let strVal = '';
      let isEscaped = false;
      let closed = false;

      while (i < text.length) {
        const c = text[i];
        if (c === '\n' || c === '\r') {
          return {
            tokens,
            error: {
              line: startLine,
              column: startCol,
              position: startPos,
              message: 'Unterminated string constant',
              thaiHint: `บรรทัดที่ ${startLine} คอลัมน์ ${startCol}: ลืมปิดเครื่องหมายคำพูด (")`,
            },
          };
        }
        if (isEscaped) {
          strVal += c;
          isEscaped = false;
        } else if (c === '\\') {
          isEscaped = true;
          strVal += c;
        } else if (c === '"') {
          i++; col++;
          closed = true;
          break;
        } else {
          strVal += c;
        }
        i++; col++;
      }

      if (!closed) {
        return {
          tokens,
          error: {
            line: startLine,
            column: startCol,
            position: startPos,
            message: 'Unterminated string constant at end of file',
            thaiHint: `บรรทัดที่ ${startLine} คอลัมน์ ${startCol}: ลืมปิดเครื่องหมายคำพูด (") ที่ท้ายข้อความ`,
          },
        };
      }

      tokens.push({
        type: 'STRING',
        value: strVal,
        line: startLine,
        col: startCol,
        pos: startPos,
        endLine: line,
        endCol: col,
        endPos: i,
      });
      continue;
    }

    // Single-quoted string
    if (ch === "'") {
      i++; col++;
      let strVal = '';
      let isEscaped = false;

      while (i < text.length) {
        const c = text[i];
        if (c === '\n' || c === '\r') {
          break;
        }
        if (isEscaped) {
          strVal += c;
          isEscaped = false;
        } else if (c === '\\') {
          isEscaped = true;
          strVal += c;
        } else if (c === "'") {
          i++; col++;
          break;
        } else {
          strVal += c;
        }
        i++; col++;
      }

      tokens.push({
        type: 'SINGLE_STRING',
        value: strVal,
        line: startLine,
        col: startCol,
        pos: startPos,
        endLine: line,
        endCol: col,
        endPos: i,
      });
      continue;
    }

    // Numbers: e.g. -123.45e+10
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const numStart = i;
      while (i < text.length && /[-+0-9.eE]/.test(text[i])) {
        i++; col++;
      }
      tokens.push({
        type: 'NUMBER',
        value: text.slice(numStart, i),
        line: startLine,
        col: startCol,
        pos: startPos,
        endLine: line,
        endCol: col,
        endPos: i,
      });
      continue;
    }

    // Identifiers or unquoted words (true, false, null, or word)
    if (/[a-zA-Z_$]/.test(ch)) {
      const idStart = i;
      while (i < text.length && /[a-zA-Z0-9_$]/.test(text[i])) {
        i++; col++;
      }
      const word = text.slice(idStart, i);
      let type: Token['type'] = 'UNQUOTED_WORD';
      if (word === 'true' || word === 'false') type = 'BOOLEAN';
      else if (word === 'null') type = 'NULL';

      tokens.push({
        type,
        value: word,
        line: startLine,
        col: startCol,
        pos: startPos,
        endLine: line,
        endCol: col,
        endPos: i,
      });
      continue;
    }

    // Unknown symbol
    tokens.push({
      type: 'UNKNOWN',
      value: ch,
      line: startLine,
      col: startCol,
      pos: startPos,
      endLine: line,
      endCol: col + 1,
      endPos: i + 1,
    });
    i++; col++;
  }

  return { tokens, error: null };
}

interface ParseStackItem {
  type: 'OBJECT' | 'ARRAY';
  openLine: number;
  openCol: number;
  openPos: number;
  state: 'KEY_OR_CLOSE' | 'COLON' | 'VALUE' | 'COMMA_OR_CLOSE';
  lastItemEndLine?: number;
  lastItemEndCol?: number;
  lastItemEndPos?: number;
  lastKeyName?: string;
  hasCommaTrailing?: boolean;
}

/**
 * Accurately analyzes JSON syntax errors at the AST/token level,
 * pinpointing the EXACT culprit line (e.g. where comma was missed)
 * instead of the shifted line reported by native JSON.parse().
 */
export function parseJsonError(errorMsg: string, jsonText: string): JsonErrorInfo {
  if (!jsonText || !jsonText.trim()) {
    return {
      message: 'Empty JSON text',
      thaiHint: 'กรุณากรอกข้อมูล JSON',
      line: 1,
      column: 1,
      position: 0,
    };
  }

  // 1. Run Tokenizer
  const { tokens, error: tokenError } = tokenize(jsonText);
  if (tokenError) {
    return tokenError;
  }

  const nonCommentTokens = tokens.filter((t) => t.type !== 'COMMENT');
  if (nonCommentTokens.length === 0) {
    return {
      message: 'Empty JSON content',
      thaiHint: 'กรุณากรอกข้อมูล JSON',
      line: 1,
      column: 1,
      position: 0,
    };
  }

  const stack: ParseStackItem[] = [];
  let rootParsed = false;

  for (let idx = 0; idx < nonCommentTokens.length; idx++) {
    const token = nonCommentTokens[idx];

    if (stack.length === 0) {
      if (rootParsed) {
        return {
          line: token.line,
          column: token.col,
          position: token.pos,
          message: `Unexpected token '${token.value}' after root JSON`,
          thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: พบข้อมูลส่วนเกินหลังจากจบโครงสร้าง JSON`,
        };
      }

      if (token.type === 'LBRACE') {
        stack.push({
          type: 'OBJECT',
          openLine: token.line,
          openCol: token.col,
          openPos: token.pos,
          state: 'KEY_OR_CLOSE',
        });
        continue;
      } else if (token.type === 'LBRACKET') {
        stack.push({
          type: 'ARRAY',
          openLine: token.line,
          openCol: token.col,
          openPos: token.pos,
          state: 'VALUE',
        });
        continue;
      } else if (
        token.type === 'STRING' ||
        token.type === 'NUMBER' ||
        token.type === 'BOOLEAN' ||
        token.type === 'NULL'
      ) {
        rootParsed = true;
        continue;
      } else {
        return {
          line: token.line,
          column: token.col,
          position: token.pos,
          message: `Invalid root token '${token.value}'`,
          thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: โครงสร้าง JSON ต้องเริ่มต้นด้วย { หรือ [ หรือค่าข้อมูลที่ถูกต้อง`,
        };
      }
    }

    const ctx = stack[stack.length - 1];

    if (ctx.type === 'OBJECT') {
      if (ctx.state === 'KEY_OR_CLOSE') {
        if (token.type === 'RBRACE') {
          if (ctx.hasCommaTrailing) {
            return {
              line: ctx.lastItemEndLine || token.line,
              column: ctx.lastItemEndCol || token.col,
              position: ctx.lastItemEndPos || token.pos,
              message: 'Trailing comma before object close',
              thaiHint: `บรรทัดที่ ${ctx.lastItemEndLine || token.line}: มีเครื่องหมายจุลภาค (,) เกินที่ตัวสุดท้ายก่อนปิดวงเล็บ }`,
            };
          }
          stack.pop();
          if (stack.length === 0) rootParsed = true;
          else {
            const parent = stack[stack.length - 1];
            parent.state = 'COMMA_OR_CLOSE';
            parent.lastItemEndLine = token.endLine;
            parent.lastItemEndCol = token.endCol;
            parent.lastItemEndPos = token.endPos;
          }
          continue;
        }

        if (token.type === 'STRING') {
          ctx.state = 'COLON';
          ctx.lastKeyName = token.value;
          ctx.hasCommaTrailing = false;
          continue;
        }

        if (token.type === 'SINGLE_STRING') {
          return {
            line: token.line,
            column: token.col,
            position: token.pos,
            message: `Single quoted key '${token.value}'`,
            thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: ชื่อ Key ต้องครอบด้วย Double Quote (") เท่านั้น ห้ามใช้ Single Quote (')`,
          };
        }

        if (token.type === 'UNQUOTED_WORD') {
          return {
            line: token.line,
            column: token.col,
            position: token.pos,
            message: `Unquoted key '${token.value}'`,
            thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: ชื่อ Key '${token.value}' ต้องครอบด้วยเครื่องหมายคำพูดคู่ (")`,
          };
        }

        return {
          line: token.line,
          column: token.col,
          position: token.pos,
          message: `Expected key but found '${token.value}'`,
          thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: คาดหวังชื่อ Key ใน Object แต่พบ '${token.value}'`,
        };
      }

      if (ctx.state === 'COLON') {
        if (token.type === 'COLON') {
          ctx.state = 'VALUE';
          continue;
        }
        return {
          line: token.line,
          column: token.col,
          position: token.pos,
          message: `Expected ':' after key '${ctx.lastKeyName}'`,
          thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: ขาดเครื่องหมายโคลอน (:) หลัง Key "${ctx.lastKeyName}"`,
        };
      }

      if (ctx.state === 'VALUE') {
        if (
          token.type === 'STRING' ||
          token.type === 'NUMBER' ||
          token.type === 'BOOLEAN' ||
          token.type === 'NULL'
        ) {
          ctx.state = 'COMMA_OR_CLOSE';
          ctx.lastItemEndLine = token.endLine;
          ctx.lastItemEndCol = token.endCol;
          ctx.lastItemEndPos = token.endPos;
          continue;
        }

        if (token.type === 'SINGLE_STRING') {
          return {
            line: token.line,
            column: token.col,
            position: token.pos,
            message: `Single quoted value for key '${ctx.lastKeyName}'`,
            thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: ค่าของ "${ctx.lastKeyName}" ต้องครอบด้วย Double Quote (") ห้ามใช้ Single Quote (')`,
          };
        }

        if (token.type === 'LBRACE') {
          stack.push({
            type: 'OBJECT',
            openLine: token.line,
            openCol: token.col,
            openPos: token.pos,
            state: 'KEY_OR_CLOSE',
          });
          continue;
        }

        if (token.type === 'LBRACKET') {
          stack.push({
            type: 'ARRAY',
            openLine: token.line,
            openCol: token.col,
            openPos: token.pos,
            state: 'VALUE',
          });
          continue;
        }

        return {
          line: token.line,
          column: token.col,
          position: token.pos,
          message: `Invalid value '${token.value}' for key '${ctx.lastKeyName}'`,
          thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: ค่าของ Key "${ctx.lastKeyName}" ไม่ถูกต้อง (พบ '${token.value}')`,
        };
      }

      if (ctx.state === 'COMMA_OR_CLOSE') {
        if (token.type === 'COMMA') {
          ctx.state = 'KEY_OR_CLOSE';
          ctx.hasCommaTrailing = true;
          ctx.lastItemEndLine = token.endLine;
          ctx.lastItemEndCol = token.endCol;
          ctx.lastItemEndPos = token.endPos;
          continue;
        }

        if (token.type === 'RBRACE') {
          stack.pop();
          if (stack.length === 0) rootParsed = true;
          else {
            const parent = stack[stack.length - 1];
            parent.state = 'COMMA_OR_CLOSE';
            parent.lastItemEndLine = token.endLine;
            parent.lastItemEndCol = token.endCol;
            parent.lastItemEndPos = token.endPos;
          }
          continue;
        }

        // If unexpected symbol or unknown character (e.g. '.', ';', '!', etc.)
        if (
          token.type === 'UNKNOWN' ||
          token.value === '.' ||
          token.value === ';' ||
          !/^[a-zA-Z0-9_"{[\]]$/.test(token.value[0] || '')
        ) {
          return {
            line: token.line,
            column: token.col,
            position: token.pos,
            message: `Unexpected character '${token.value}' after property value`,
            thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: พบตัวอักษร '${token.value}' ที่ไม่ถูกต้อง (คาดหวังเครื่องหมายจุลภาค ',' หรือปิดปีกกา '}')`,
          };
        }

        // MISSING COMMA CASE in Object:
        // We are at the start of the next property, meaning the PREVIOUS line is missing the comma!
        const culpritLine = ctx.lastItemEndLine || token.line;
        const culpritCol = ctx.lastItemEndCol || token.col;
        const culpritPos = ctx.lastItemEndPos || token.pos;

        return {
          line: culpritLine,
          column: culpritCol,
          position: culpritPos,
          message: `Missing comma after field before '${token.value}'`,
          thaiHint: `บรรทัดที่ ${culpritLine}: ขาดเครื่องหมายจุลภาค (,) ท้ายฟิลด์ (ก่อนขึ้น '${token.value}' ที่บรรทัด ${token.line})`,
        };
      }
    } else if (ctx.type === 'ARRAY') {
      if (ctx.state === 'VALUE') {
        if (token.type === 'RBRACKET') {
          if (ctx.hasCommaTrailing) {
            return {
              line: ctx.lastItemEndLine || token.line,
              column: ctx.lastItemEndCol || token.col,
              position: ctx.lastItemEndPos || token.pos,
              message: 'Trailing comma before array close',
              thaiHint: `บรรทัดที่ ${ctx.lastItemEndLine || token.line}: มีเครื่องหมายจุลภาค (,) เกินที่ตัวสุดท้ายก่อนปิดก้ามปู ]`,
            };
          }
          stack.pop();
          if (stack.length === 0) rootParsed = true;
          else {
            const parent = stack[stack.length - 1];
            parent.state = 'COMMA_OR_CLOSE';
            parent.lastItemEndLine = token.endLine;
            parent.lastItemEndCol = token.endCol;
            parent.lastItemEndPos = token.endPos;
          }
          continue;
        }

        if (
          token.type === 'STRING' ||
          token.type === 'NUMBER' ||
          token.type === 'BOOLEAN' ||
          token.type === 'NULL'
        ) {
          ctx.state = 'COMMA_OR_CLOSE';
          ctx.hasCommaTrailing = false;
          ctx.lastItemEndLine = token.endLine;
          ctx.lastItemEndCol = token.endCol;
          ctx.lastItemEndPos = token.endPos;
          continue;
        }

        if (token.type === 'SINGLE_STRING') {
          return {
            line: token.line,
            column: token.col,
            position: token.pos,
            message: `Single quoted item in array`,
            thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: ข้อมูลใน Array ต้องครอบด้วย Double Quote (") ห้ามใช้ Single Quote (')`,
          };
        }

        if (token.type === 'LBRACE') {
          ctx.hasCommaTrailing = false;
          stack.push({
            type: 'OBJECT',
            openLine: token.line,
            openCol: token.col,
            openPos: token.pos,
            state: 'KEY_OR_CLOSE',
          });
          continue;
        }

        if (token.type === 'LBRACKET') {
          ctx.hasCommaTrailing = false;
          stack.push({
            type: 'ARRAY',
            openLine: token.line,
            openCol: token.col,
            openPos: token.pos,
            state: 'VALUE',
          });
          continue;
        }

        return {
          line: token.line,
          column: token.col,
          position: token.pos,
          message: `Invalid array element '${token.value}'`,
          thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: ข้อมูลใน Array ไม่ถูกต้อง (พบ '${token.value}')`,
        };
      }

      if (ctx.state === 'COMMA_OR_CLOSE') {
        if (token.type === 'COMMA') {
          ctx.state = 'VALUE';
          ctx.hasCommaTrailing = true;
          ctx.lastItemEndLine = token.endLine;
          ctx.lastItemEndCol = token.endCol;
          ctx.lastItemEndPos = token.endPos;
          continue;
        }

        if (token.type === 'RBRACKET') {
          stack.pop();
          if (stack.length === 0) rootParsed = true;
          else {
            const parent = stack[stack.length - 1];
            parent.state = 'COMMA_OR_CLOSE';
            parent.lastItemEndLine = token.endLine;
            parent.lastItemEndCol = token.endCol;
            parent.lastItemEndPos = token.endPos;
          }
          continue;
        }

        // If unexpected symbol or unknown character (e.g. '.', ';', '!', etc.)
        if (
          token.type === 'UNKNOWN' ||
          token.value === '.' ||
          token.value === ';' ||
          !/^[a-zA-Z0-9_"{[\]]$/.test(token.value[0] || '')
        ) {
          return {
            line: token.line,
            column: token.col,
            position: token.pos,
            message: `Unexpected character '${token.value}' after array element`,
            thaiHint: `บรรทัดที่ ${token.line} คอลัมน์ ${token.col}: พบตัวอักษร '${token.value}' ที่ไม่ถูกต้อง (คาดหวังเครื่องหมายจุลภาค ',' หรือปิดก้ามปู ']')`,
          };
        }

        // MISSING COMMA IN ARRAY
        const culpritLine = ctx.lastItemEndLine || token.line;
        const culpritCol = ctx.lastItemEndCol || token.col;
        const culpritPos = ctx.lastItemEndPos || token.pos;

        return {
          line: culpritLine,
          column: culpritCol,
          position: culpritPos,
          message: `Missing comma between array items before '${token.value}'`,
          thaiHint: `บรรทัดที่ ${culpritLine}: ขาดเครื่องหมายจุลภาค (,) คั่นระหว่างสมาชิกใน Array (ก่อนขึ้นบรรทัดที่ ${token.line})`,
        };
      }
    }
  }

  // End of Stream (EOF) with unclosed brackets
  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return {
      line: unclosed.openLine,
      column: unclosed.openCol,
      position: unclosed.openPos,
      message: `Unclosed ${unclosed.type === 'OBJECT' ? '{' : '['} opened at line ${unclosed.openLine}`,
      thaiHint: `บรรทัดที่ ${unclosed.openLine} คอลัมน์ ${unclosed.openCol}: ${
        unclosed.type === 'OBJECT' ? 'ปีกกา {' : 'ก้ามปู ['
      } ที่เปิดไว้ ยังไม่ได้ถูกปิด`,
    };
  }

  // Fallback if scanner succeeded but native JSON.parse threw
  return {
    line: 1,
    column: 1,
    position: 0,
    message: errorMsg,
    thaiHint: 'โปรดตรวจสอบความถูกต้องของไวยากรณ์ JSON',
  };
}

/**
 * Inserts missing commas between adjacent properties or array elements.
 */
function insertMissingCommas(text: string): { result: string; changed: boolean } {
  const lines = text.split('\n');
  const resultLines: string[] = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    let nextTrimmed = '';
    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j].trim();
      if (candidate && !candidate.startsWith('//') && !candidate.startsWith('/*')) {
        nextTrimmed = candidate;
        break;
      }
    }

    let processedLine = line;

    if (trimmed && nextTrimmed) {
      const isEndingValue =
        trimmed.endsWith('"') ||
        trimmed.endsWith('}') ||
        trimmed.endsWith(']') ||
        /\b(true|false|null|\d+(\.\d+)?)\s*$/.test(trimmed);

      const lacksComma =
        !trimmed.endsWith(',') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('[') &&
        !trimmed.endsWith(':');

      const nextStartsNewPropertyOrItem =
        /^"([^"\\]|\\.)*"\s*:/.test(nextTrimmed) ||
        /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(nextTrimmed) ||
        /^[{[]/.test(nextTrimmed) ||
        /^"([^"\\]|\\.)*"/.test(nextTrimmed) ||
        /^(true|false|null|\d+)/.test(nextTrimmed);

      const nextIsClosing = /^[}\]]/.test(nextTrimmed);

      if (isEndingValue && lacksComma && nextStartsNewPropertyOrItem && !nextIsClosing) {
        processedLine = line + ',';
        changed = true;
      }
    }

    resultLines.push(processedLine);
  }

  return { result: resultLines.join('\n'), changed };
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
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        stack.push('}');
      } else if (ch === '[') {
        stack.push(']');
      } else if (ch === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '}') {
          stack.pop();
        }
      } else if (ch === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === ']') {
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

  // Remove trailing comma before closing brackets
  result = result.trimEnd().replace(/,\s*$/, '');

  while (stack.length > 0) {
    const closing = stack.pop()!;
    result += '\n' + closing;
  }

  return { result, changed: true };
}

/**
 * Attempts to automatically fix confident and deterministic JSON syntax errors:
 * 1. Missing closing braces / brackets (`}` and `]`)
 * 2. Missing commas between properties or array items
 * 3. Misplaced dots / semicolons (e.g. "version": "1.0.0". or ;)
 * 4. Trailing commas before `}` or `]`
 * 5. Single quotes instead of double quotes
 * 6. Unquoted object keys
 * 7. Stripping JavaScript-style comments
 *
 * GUARANTEE: Only returns success: true if the resulting output strictly passes JSON.parse().
 * If there is any ambiguity or it still fails to parse, it will return success: false without touching user code.
 */
export function attemptFixJson(raw: string): AutoFixResult {
  if (!raw || !raw.trim()) {
    return { fixed: null, success: false, fixesApplied: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return { fixed: JSON.stringify(parsed, null, 2), success: true, fixesApplied: [] };
  } catch {
    // Proceed to repair
  }

  const fixesApplied: string[] = [];
  let text = raw;

  // Step 1: Remove comments
  if (/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/m.test(text)) {
    text = text.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
    fixesApplied.push('ลบคอมเมนต์ (Removed JS comments)');
  }

  // Step 2: Replace single-quoted strings & keys
  if (/'((?:\\.|[^'])*)'/.test(text)) {
    text = text.replace(/'((?:\\.|[^'])*)'/g, (_, content: string) => {
      const unescaped = content.replace(/\\'/g, "'");
      const escaped = unescaped.replace(/"/g, '\\"');
      return '"' + escaped + '"';
    });
    fixesApplied.push('เปลี่ยน Single Quote เป็น Double Quote');
  }

  // Step 3: Fix unquoted property keys
  if (/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.test(text)) {
    text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    fixesApplied.push('ใส่เครื่องหมายคำพูดที่ Key');
  }

  // Step 3.5: Fix misplaced dots or semicolons at end of properties (e.g. "version": "1.0.0". or ;)
  if (/([0-9"}\]true|false|null])\s*[;\.]\s*$/m.test(text)) {
    const candidateComma = text.replace(/([0-9"}\]true|false|null])\s*[;\.]\s*$/gm, '$1,');
    try {
      JSON.parse(candidateComma);
      text = candidateComma;
      fixesApplied.push('เปลี่ยนจุด/เซมิโคลอนผิดตำแหน่งเป็นลูกน้ำ (Replaced misplaced dot/semicolon with comma)');
    } catch {
      const candidateStrip = text.replace(/([0-9"}\]true|false|null])\s*[;\.]\s*$/gm, '$1');
      try {
        JSON.parse(candidateStrip);
        text = candidateStrip;
        fixesApplied.push('ลบจุด/เซมิโคลอนส่วนเกิน (Removed misplaced dot/semicolon)');
      } catch {
        // Proceed with other rules
        text = candidateComma;
      }
    }
  }

  // Step 4: Insert missing commas between lines/properties/elements
  const commaFix = insertMissingCommas(text);
  if (commaFix.changed) {
    text = commaFix.result;
    fixesApplied.push('เติมลูกน้ำที่ขาด (Added missing commas)');
  }

  // Step 5: Remove trailing commas before closing braces/brackets
  if (/,\s*([}\]])/.test(text)) {
    text = text.replace(/,\s*([}\]])/g, '$1');
    fixesApplied.push('ลบลูกน้ำส่วนเกิน (Removed trailing commas)');
  }

  // Step 6: Complete missing closing braces/brackets at the end
  const bracketFix = completeMissingBrackets(text);
  if (bracketFix.changed) {
    text = bracketFix.result;
    fixesApplied.push('ปิดวงเล็บปีกกา/ก้ามปูให้ครบ (Closed missing braces/brackets)');
  }

  try {
    const parsed = JSON.parse(text);
    return {
      fixed: JSON.stringify(parsed, null, 2),
      success: true,
      fixesApplied,
    };
  } catch {
    return {
      fixed: null,
      success: false,
      fixesApplied: [],
    };
  }
}
