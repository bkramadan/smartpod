/**
 * AI ENGINE — the explaining part.
 *
 * Turns the rule results into a short, plain-language message for the person.
 * - If ANTHROPIC_API_KEY is set, Claude writes it.
 * - Otherwise (or if Claude is slow or fails), a template writes it.
 *
 * Safety rules given to Claude: explain only the findings it receives, never add new
 * ones, never tell anyone to change or stop a dose, and send serious issues to the
 * doctor or pharmacist.
 */
import type { AiReport, Conflict, User } from '@smartpod/shared';

export const DISCLAIMER =
  'Smart Pod prototype: demo rules, not medical advice. Always check warnings with your doctor or pharmacist.';

export type Findings = Pick<AiReport, 'conflicts' | 'timing' | 'food'>;

export interface Explainer {
  explain(findings: Findings, person: Pick<User, 'name' | 'role' | 'segment'>): Promise<Pick<AiReport, 'explanation' | 'explainedBy'>>;
}

const count = (list: Conflict[], sev: Conflict['severity']) => list.filter((c) => c.severity === sev).length;

export function templateExplanation(findings: Findings, role: User['role'] = 'patient'): string {
  const { conflicts } = findings;
  if (!conflicts.length) {
    return 'No conflicts found between these items. The times shown are the best fit for your day.';
  }
  const serious = count(conflicts, 'serious');
  const moderate = count(conflicts, 'moderate');
  const minor = count(conflicts, 'minor');
  const parts = [
    serious && `${serious} serious`,
    moderate && `${moderate} moderate`,
    minor && `${minor} minor`,
  ].filter(Boolean);
  const top = conflicts[0];
  let text = `Found ${parts.join(', ')} issue${conflicts.length > 1 ? 's' : ''}. `;
  text += `Most important: ${top.aName} with ${top.bName}. ${top.reason} ${top.advice}`;
  if (serious) {
    text += role === 'doctor' || role === 'pharmacist'
      ? ' Review the combination before confirming.'
      : ' Please talk to your doctor or pharmacist before the next dose.';
  }
  return text;
}

/** Uses only the template. Good for tests and when no API key is set. */
export const templateExplainer: Explainer = {
  async explain(findings, person) {
    return { explanation: templateExplanation(findings, person.role), explainedBy: 'template' };
  },
};

/** Calls Claude through the Anthropic Messages API, with the template as fallback. */
export function claudeExplainer(apiKey: string, model: string, timeoutMs = 8000): Explainer {
  const cache = new Map<string, string>();

  return {
    async explain(findings, person) {
      const input = {
        person: { role: person.role, segment: person.segment ?? 'medication' },
        conflicts: findings.conflicts.map(({ aName, bName, severity, reason, advice, type }) => ({
          between: `${aName} + ${bName}`, type, severity, reason, advice,
        })),
        timing: findings.timing.map((t) => ({ item: t.name, times: t.suggestedTimes, why: t.why })),
        food: findings.food.map((f) => ({ item: f.name, tip: f.tip })),
      };
      const key = JSON.stringify(input);
      const cached = cache.get(key);
      if (cached) return { explanation: cached, explainedBy: 'claude' };

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 400,
            system:
              'You explain medication and supplement findings to people using the Smart Pod app. ' +
              'Write at most 110 words, in plain, warm language, without headings or lists. ' +
              'Use ONLY the findings in the JSON you are given: never add a conflict, never remove one, ' +
              'and never tell anyone to change, start or stop a dose. If there is a serious finding, ' +
              'say clearly to contact their doctor or pharmacist before the next dose. ' +
              'If the reader is a doctor or pharmacist, be concise and clinical in tone.',
            messages: [{ role: 'user', content: `Findings:\n${key}` }],
          }),
        });
        if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as { content?: { type: string; text?: string }[] };
        const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
        if (!text) throw new Error('Empty answer from Claude');
        if (cache.size > 200) cache.clear();
        cache.set(key, text);
        return { explanation: text, explainedBy: 'claude' };
      } catch (err) {
        console.warn(`Claude explanation failed, using template: ${(err as Error).message}`);
        return { explanation: templateExplanation(findings, person.role), explainedBy: 'template' };
      }
    },
  };
}
