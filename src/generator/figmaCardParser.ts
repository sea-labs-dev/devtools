/**
 * Figma Card to Azure DevOps / JSON Task Parser
 *
 * Extracts Title and Effort (Story Points / Hours) from raw copied Figma/FigJam cards
 * and formats them into JSON, Azure DevOps CSV, and Jira CSV.
 */

export interface FigmaCardItem {
  id: string;
  title: string;
  effort: number;
  type?: string;
  activity?: string;
  rawLines?: string[];
}

export interface FigmaParserOptions {
  titleKey?: string; // default: 'title'
  effortKey?: string; // default: 'effort'
  extractType?: boolean; // default: false
  defaultEffort?: number; // default: 1
  prefix?: string;
  suffix?: string;
  workitemType?: string; // default: 'Task'
  defaultActivity?: string; // default: 'Development'
}

/**
 * Checks if a string line is an effort / story point representation.
 */
export function isEffortLine(rawLine: string): { isEffort: boolean; value: number } {
  if (!rawLine) return { isEffort: false, value: 0 };
  
  // Replace non-breaking spaces and trim
  const line = rawLine.replace(/\u00A0/g, ' ').replace(/\u200B/g, '').trim();
  if (!line) return { isEffort: false, value: 0 };

  // Match numbers, decimals, and numbers with units/keywords like:
  // "2", "0.5", "1.5", "2 pts", "2 sp", "2.5h", "Effort: 2", "SP: 3", "[2]", "(0.5)"
  const effortRegex = /^(?:(?:effort|points?|pts?|sp|est(?:imate)?|hours?|hrs?|h|man-days?|md|pt)\s*[:=]?\s*)?\(?\[?\s*(\d+(?:[.,]\d+)?)\s*(?:pts?|points?|sp|hours?|hrs?|h|d|days?|md|pt)?\s*\]?\)?$/i;

  const match = line.match(effortRegex);
  if (match) {
    const numStr = match[1].replace(',', '.');
    const parsed = parseFloat(numStr);
    if (!isNaN(parsed) && parsed >= 0) {
      return { isEffort: true, value: parsed };
    }
  }

  return { isEffort: false, value: 0 };
}

/**
 * Detects activity / category from title prefix
 */
export function detectActivity(title: string): { activity: string; type: string } {
  const lower = title.toLowerCase().trim();
  const cleanTitle = lower.replace(/^(?:api|mobile|web|be|fe)\s*:\s*/i, '');
  if (cleanTitle.startsWith('ui') || cleanTitle.startsWith('design') || cleanTitle.startsWith('fe') || cleanTitle.startsWith('frontend')) {
    return { activity: 'Design / UI', type: 'UI' };
  }
  if (cleanTitle.startsWith('function') || cleanTitle.startsWith('logic') || cleanTitle.startsWith('feature')) {
    return { activity: 'Development', type: 'Function' };
  }
  if (cleanTitle.startsWith('api') || cleanTitle.startsWith('be') || cleanTitle.startsWith('backend') || cleanTitle.startsWith('service')) {
    return { activity: 'Development', type: 'API' };
  }
  if (cleanTitle.startsWith('test') || cleanTitle.startsWith('qa') || cleanTitle.startsWith('bug') || cleanTitle.startsWith('fix')) {
    return { activity: 'Testing', type: 'Testing' };
  }
  return { activity: 'Development', type: 'Task' };
}

/**
 * Parses raw copied text from Figma cards into structured card items.
 */
export function parseFigmaCards(rawText: string, options: FigmaParserOptions = {}): FigmaCardItem[] {
  if (!rawText || !rawText.trim()) return [];

  const defaultEffort = options.defaultEffort ?? 1;
  const rawPrefix = options.prefix ? options.prefix.trim() : '';
  const prefix = rawPrefix ? `${rawPrefix} ` : '';
  const suffix = options.suffix ? ` ${options.suffix.trim()}` : '';

  // Standardize newlines and remove invisible chars
  const sanitized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '');

  const lines = sanitized.split('\n');
  const cards: FigmaCardItem[] = [];

  let currentTitleLines: string[] = [];
  let pendingTopEffort: number | null = null;
  let cardIdCounter = 1;

  const formatFinalTitle = (titleText: string): string => {
    const trimmed = titleText.replace(/\s+/g, ' ').trim();
    if (rawPrefix && trimmed.toLowerCase().startsWith(rawPrefix.toLowerCase())) {
      return `${trimmed}${suffix}`.trim();
    }
    return `${prefix}${trimmed}${suffix}`.trim();
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim().replace(/\s+/g, ' ');

    if (!trimmed) {
      continue; // skip blank lines
    }

    const effortCheck = isEffortLine(trimmed);

    if (effortCheck.isEffort) {
      if (currentTitleLines.length > 0) {
        // Effort is at the end of the card (Bottom effort pattern)
        const combinedTitle = currentTitleLines.join(' ').replace(/\s+/g, ' ').trim();
        const finalTitle = formatFinalTitle(combinedTitle);
        const meta = detectActivity(combinedTitle);

        cards.push({
          id: `card-${cardIdCounter++}`,
          title: finalTitle,
          effort: effortCheck.value,
          type: meta.type,
          activity: meta.activity,
          rawLines: [...currentTitleLines, trimmed],
        });

        currentTitleLines = [];
        pendingTopEffort = null;
      } else {
        // Effort might be at the top of the card (Top effort pattern)
        pendingTopEffort = effortCheck.value;
      }
    } else {
      // Non-effort text line
      if (pendingTopEffort !== null && currentTitleLines.length > 0 && trimmed.match(/^(UI|Function|API|Task|Feature|Bug|Story|FE|BE)\b/i)) {
        // A new card header started after a top-effort card
        const combinedTitle = currentTitleLines.join(' ').replace(/\s+/g, ' ').trim();
        const finalTitle = formatFinalTitle(combinedTitle);
        const meta = detectActivity(combinedTitle);

        cards.push({
          id: `card-${cardIdCounter++}`,
          title: finalTitle,
          effort: pendingTopEffort,
          type: meta.type,
          activity: meta.activity,
          rawLines: [...currentTitleLines],
        });

        currentTitleLines = [trimmed];
        pendingTopEffort = null;
      } else {
        currentTitleLines.push(trimmed);
      }
    }
  }

  // Handle any remaining title lines
  if (currentTitleLines.length > 0) {
    const combinedTitle = currentTitleLines.join(' ').replace(/\s+/g, ' ').trim();
    const finalTitle = formatFinalTitle(combinedTitle);
    const meta = detectActivity(combinedTitle);

    cards.push({
      id: `card-${cardIdCounter++}`,
      title: finalTitle,
      effort: pendingTopEffort !== null ? pendingTopEffort : defaultEffort,
      type: meta.type,
      activity: meta.activity,
      rawLines: [...currentTitleLines],
    });
  }

  return cards;
}

/**
 * Converts Figma cards to JSON format with custom field mapping
 */
export function formatCardsToJson(cards: FigmaCardItem[], options: FigmaParserOptions = {}): string {
  const titleKey = options.titleKey || 'title';
  const effortKey = options.effortKey || 'effort';
  const extractType = options.extractType || false;

  const result = cards.map((card) => {
    const obj: Record<string, any> = {};
    obj[titleKey] = card.title;
    if (extractType && card.type) {
      obj['type'] = card.type;
    }
    obj[effortKey] = card.effort;
    return obj;
  });

  return JSON.stringify(result, null, 2);
}

/**
 * Converts Figma cards to Azure DevOps Work Items CSV format
 */
export function formatCardsToAzureCsv(cards: FigmaCardItem[], options: FigmaParserOptions = {}): string {
  const workItemType = options.workitemType || 'Task';
  const defaultActivity = options.defaultActivity || 'Development';

  const headers = ['ID', 'Work Item Type', 'Title', 'Original Estimate', 'Remaining Work', 'Activity'];
  const rows = cards.map((card) => {
    const escapedTitle = `"${card.title.replace(/"/g, '""')}"`;
    const activity = card.activity || defaultActivity;
    return `,"${workItemType}",${escapedTitle},${card.effort},${card.effort},"${activity}"`;
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Converts Figma cards to Jira Issue CSV format
 */
export function formatCardsToJiraCsv(cards: FigmaCardItem[], options: FigmaParserOptions = {}): string {
  const issueType = options.workitemType || 'Task';
  const headers = ['Issue Type', 'Summary', 'Story Points'];
  const rows = cards.map((card) => {
    const escapedSummary = `"${card.title.replace(/"/g, '""')}"`;
    return `"${issueType}",${escapedSummary},${card.effort}`;
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Converts Figma cards to Azure DevOps REST API Batch format
 */
export function formatCardsToAzureApiJson(cards: FigmaCardItem[], options: FigmaParserOptions = {}): string {
  const workItemType = options.workitemType || 'Task';

  const batchPayload = cards.map((card) => [
    { op: 'add', path: '/fields/System.WorkItemType', value: workItemType },
    { op: 'add', path: '/fields/System.Title', value: card.title },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.OriginalEstimate', value: card.effort },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: card.effort },
    { op: 'add', path: '/fields/Microsoft.VSTS.Common.Activity', value: card.activity || 'Development' },
  ]);

  return JSON.stringify(batchPayload, null, 2);
}
