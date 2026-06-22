export function renderPrompt(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return context[key] ?? `{{${key}}}`;
  });
}
