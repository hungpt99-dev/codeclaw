const REQ_TABLE_PATTERN = /\|\s*(REQ-\d+)\s*\|\s*([^|]+?)\s*\|/g;
const REQ_INLINE_PATTERN = /\*\*ID\*\*:\s*(REQ-\d+)(?:\s*\n\s*\*\*Text\*\*:\s*(.+?))?(?:\s*\n|$)/gi;
const AC_TABLE_PATTERN = /\|\s*(AC-\d+)\s*\|\s*([^|]+?)\s*\|/g;
const AC_INLINE_PATTERN =
  /\*\*ID\*\*:\s*(AC-\d+)(?:\s*\n\s*\*\*Criteria\*\*:\s*(.+?))?(?:\s*\n|$)/gi;
const TASK_TABLE_PATTERN = /\|\s*(TASK-\d+)\s*\|\s*([^|]+?)\s*\|/g;
const TASK_INLINE_PATTERN =
  /\*\*ID\*\*:\s*(TASK-\d+)(?:\s*\n\s*\*\*Title\*\*:\s*(.+?))?(?:\s*\n|$)/gi;
const TC_TABLE_PATTERN = /\|\s*(TC-\d+)\s*\|\s*([^|]+?)\s*\|/g;
const TC_INLINE_PATTERN =
  /\*\*ID\*\*:\s*(TC-\d+)(?:\s*\n\s*\*\*Scenario\*\*:\s*(.+?))?(?:\s*\n|$)/gi;

function extractFromMarkdown(
  content: string,
  tablePattern: RegExp,
  inlinePattern: RegExp,
): { id: string; text: string }[] {
  const results: { id: string; text: string }[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  const tablePatternCopy = new RegExp(
    tablePattern.source,
    tablePattern.flags.includes("g") ? tablePattern.flags : tablePattern.flags + "g",
  );
  while ((match = tablePatternCopy.exec(content)) !== null) {
    const id = match[1]?.trim();
    const text = match[2]?.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      results.push({ id, text: text ?? "" });
    }
  }

  const inlinePatternCopy = new RegExp(
    inlinePattern.source,
    inlinePattern.flags.includes("g") ? inlinePattern.flags : inlinePattern.flags + "g",
  );
  while ((match = inlinePatternCopy.exec(content)) !== null) {
    const id = match[1]?.trim();
    const text = match[2]?.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      results.push({ id, text: text ?? "" });
    }
  }

  return results;
}

export function parseRequirementId(content: string): { id: string; text: string } | null {
  const results = extractFromMarkdown(content, REQ_TABLE_PATTERN, REQ_INLINE_PATTERN);
  return results[0] ?? null;
}

export function parseAcceptanceCriteria(content: string): { id: string; text: string }[] {
  return extractFromMarkdown(content, AC_TABLE_PATTERN, AC_INLINE_PATTERN);
}

export function parseTaskBreakdown(content: string): { id: string; title: string }[] {
  return extractFromMarkdown(content, TASK_TABLE_PATTERN, TASK_INLINE_PATTERN).map((item) => ({
    id: item.id,
    title: item.text,
  }));
}

export function parseTestMatrix(content: string): { id: string; scenario: string }[] {
  return extractFromMarkdown(content, TC_TABLE_PATTERN, TC_INLINE_PATTERN).map((item) => ({
    id: item.id,
    scenario: item.text,
  }));
}
