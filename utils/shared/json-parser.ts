/**
 * JSON Parser - Robust parsing for AI responses
 *
 * Handles common AI response formats:
 * - Markdown code blocks (```json ... ```)
 * - Incomplete JSON (missing closing brackets)
 * - Trailing commas
 * - Plain JSON
 */

/**
 * Clean and parse JSON from Gemini Nano responses
 *
 * @param text - Raw text that may contain JSON (possibly wrapped in markdown)
 * @returns Parsed JSON object or array
 * @throws {Error} If no valid JSON can be extracted
 *
 * @example
 * ```typescript
 * const response = '```json\n{"name": "Test"}\n```';
 * const parsed = JSONParser.cleanJSON(response);
 * // Returns: { name: "Test" }
 * ```
 */
export class JSONParser {
  /**
   * Main entry point - tries multiple extraction strategies
   */
  static cleanJSON(text: string): object | any[] {
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from AI');
    }

    // Strategy 1: Try markdown code block extraction (```json ... ```)
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n?```|$)/);
    if (codeBlockMatch) {
      const extracted = this._tryParseJSON(codeBlockMatch[1].trim());
      if (extracted) return extracted;
    }

    // Strategy 2: Try finding JSON array ([...])
    const arrayMatch = text.match(/\[([\s\S]*)/);
    if (arrayMatch) {
      const extracted = this._tryParseJSON('[' + arrayMatch[1]);
      if (extracted) return extracted;
    }

    // Strategy 3: Try finding JSON object ({...})
    const objectMatch = text.match(/\{([\s\S]*)/);
    if (objectMatch) {
      const extracted = this._tryParseJSON('{' + objectMatch[1]);
      if (extracted) return extracted;
    }

    // Strategy 4: Try parsing entire text as-is
    const extracted = this._tryParseJSON(text);
    if (extracted) return extracted;

    // All strategies failed
    console.error('❌ Failed to extract JSON from response');
    console.error('Response length:', text.length);
    console.error('Response preview:', text.substring(0, 500));
    throw new Error('Unable to extract valid JSON from AI response');
  }

  /**
   * Helper: Try to parse JSON, auto-completing missing brackets/braces
   *
   * @param jsonText - Text that should be JSON
   * @returns Parsed JSON or null if parsing fails
   */
  private static _tryParseJSON(jsonText: string): any {
    if (!jsonText || jsonText.trim().length === 0) return null;

    // Try parsing as-is first
    try {
      return JSON.parse(jsonText);
    } catch (e) {
      // Not valid JSON, try fixing it
    }

    // Count brackets and braces
    const openBrackets = (jsonText.match(/\[/g) || []).length;
    const closeBrackets = (jsonText.match(/\]/g) || []).length;
    const openBraces = (jsonText.match(/\{/g) || []).length;
    const closeBraces = (jsonText.match(/\}/g) || []).length;

    // Auto-complete missing closing brackets/braces
    let fixed = jsonText.trim();

    // Remove trailing commas before closing brackets/braces
    fixed = fixed.replace(/,(\s*[\]}])/g, '$1');

    if (openBraces > closeBraces) {
      fixed += '\n}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      fixed += '\n]'.repeat(openBrackets - closeBrackets);
    }

    // Try parsing the fixed version
    try {
      return JSON.parse(fixed);
    } catch (e) {
      // Still can't parse - return null to try next strategy
      return null;
    }
  }
}
