type McpToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  handler: () => unknown;
};

type McpDefinition = {
  name: string;
  title: string;
  version: string;
  instructions: string;
  tools: McpToolDefinition[];
};

export function defineTool<T extends McpToolDefinition>(tool: T): T {
  return tool;
}

export function defineMcp<T extends McpDefinition>(definition: T): T {
  return definition;
}

