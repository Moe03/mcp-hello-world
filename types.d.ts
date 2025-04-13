declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(options: { name: string; version: string });
    connect(transport: any): Promise<void>;
    info(): Promise<any>;
    handleRequest(request: any): Promise<any>;
  }

  export class StdioServerTransport {
    constructor();
  }

  export interface CallToolRequestSchema {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  }

  export interface ListToolsRequestSchema {
    type: string;
  }

  export interface Tool {
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  }
} 