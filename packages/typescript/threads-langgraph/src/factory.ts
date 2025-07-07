import { LangGraphAdapter } from './langgraph-adapter';
import type { LangGraphAdapterConfig } from './langgraph-adapter';

/**
 * Creates a new LangGraph adapter instance
 *
 * @param config - Configuration for the LangGraph adapter
 * @returns A new LangGraphAdapter instance
 *
 * @example
 * ```typescript
 * const adapter = createLangGraphAdapter({
 *   apiUrl: process.env.LANGGRAPH_API_URL!,
 *   apiKey: process.env.LANGSMITH_API_KEY!,
 *   assistantId: 'my-assistant',
 * });
 * ```
 */
export function createLangGraphAdapter(config: LangGraphAdapterConfig): LangGraphAdapter {
  return new LangGraphAdapter(config);
}
