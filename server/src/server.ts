import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS_DEFINITIONS, executeTool } from './tools.js';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'mcp-lens-notes',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {
          listChanged: false,
        },
        logging: {},
      },
      instructions: 'Self-hosted notes MCP server with deterministic tools and streaming capabilities.',
    }
  );

  // 1. tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS_DEFINITIONS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as any,
        outputSchema: t.outputSchema as any,
      })),
    };
  });

  // 2. tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args = {} } = request.params;

    // Set up progress callback if request included a progressToken
    const progressToken = request.params._meta?.progressToken;

    const onProgress = progressToken
      ? async (progress: number, total: number, message: string) => {
          try {
            await server.notification({
              method: 'notifications/progress',
              params: {
                progressToken,
                progress,
                total,
                message,
              },
            });
          } catch (err) {
            // progress notifications are best-effort
          }
        }
      : undefined;

    const result = await executeTool(name, args as Record<string, unknown>, onProgress);

    return {
      content: result.content,
      structuredContent: result.structuredContent,
      isError: result.isError,
    };
  });

  return server;
}
