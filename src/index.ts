#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Simple in-memory posts store
interface Post {
  id: string;
  content: string;
  timestamp: number;
}

const posts: Post[] = [];

// --- Tool Definitions ---

const GET_WEATHER_TOOL: Tool = {
  name: "get_weather",
  description: "Gets the current weather.",
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The location to get weather for (city, address, etc.)"
      }
    },
    required: ["location"]
  },
};

const ADD_POST_TOOL: Tool = {
  name: "add_post",
  description: "Adds a simple text post.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The text content of the post to add.",
      },
    },
    required: ["content"],
  },
};

const GET_POSTS_TOOL: Tool = {
  name: "get_posts",
  description: "Retrieves all posts.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

const DELETE_POST_TOOL: Tool = {
  name: "delete_post",
  description: "Deletes a post by ID.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID of the post to delete.",
      },
    },
    required: ["id"],
  },
};

const SIMPLE_TOOLS = [
  GET_WEATHER_TOOL,
  ADD_POST_TOOL,
  GET_POSTS_TOOL,
  DELETE_POST_TOOL,
] as const;

// --- Tool Handlers ---

async function handleGetWeather(location: string) {
  
  return {
    content: [{
      type: "text",
      text: `Weather in ${location}: Sunny, 75 degrees Fahrenheit.`
    }],
    isError: false
  };
}

async function handleAddPost(content: string) {
  console.error(`Handling add_post request with content: \"${content}\"`); // Log to stderr
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return {
        content: [{ type: "text", text: "Error: Post content cannot be empty." }],
        isError: true,
    };
  }
  
  // Actually add the post to our array
  const newPost: Post = {
    id: Date.now().toString(),
    content,
    timestamp: Date.now()
  };
  
  posts.push(newPost);
  
  return {
    content: [{ type: "text", text: `Success! Post added with ID: ${newPost.id}` }],
    isError: false,
  };
}

async function handleGetPosts() {
  console.error(`Handling get_posts request, found ${posts.length} posts`);
  
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify(posts, null, 2)
    }],
    isError: false,
  };
}

async function handleDeletePost(id: string) {
  console.error(`Handling delete_post request for ID: ${id}`);
  
  const initialLength = posts.length;
  const postIndex = posts.findIndex(post => post.id === id);
  
  if (postIndex === -1) {
    return {
      content: [{ type: "text", text: `Error: No post found with ID: ${id}` }],
      isError: true,
    };
  }
  
  posts.splice(postIndex, 1);
  
  return {
    content: [{ type: "text", text: `Success! Post with ID: ${id} deleted.` }],
    isError: false,
  };
}

// --- Server Setup ---
const server = new Server(
  {
    name: "mcp-server/simple-demo",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {}, // Indicate tool capability
      prompts: {}, // Indicate prompts capability
    },
  }
);

// --- Request Handlers ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Handling ListTools request..."); // Log to stderr
  return {
    tools: SIMPLE_TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`Handling CallTool request for: ${request.params.name}`); // Log to stderr
  try {
    switch (request.params.name) {
      case "get_weather": {
        const { location } = request.params.arguments as { location: string };
        return await handleGetWeather(location);
      }

      case "add_post": {
        const { content } = request.params.arguments as { content: string };
        return await handleAddPost(content);
      }
      
      case "get_posts": {
        return await handleGetPosts();
      }
      
      case "delete_post": {
        const { id } = request.params.arguments as { id: string };
        return await handleDeletePost(id);
      }

      default:
        console.error(`Unknown tool requested: ${request.params.name}`); // Log to stderr
        return {
          content: [
            {
              type: "text",
              text: `Error: Unknown tool called: ${request.params.name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing tool call: ${errorMessage}`); // Log to stderr
    return {
      content: [
        {
          type: "text",
          text: `Internal Server Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// --- Add support for required MCP methods ---
const PromptsListSchema = z.object({
  method: z.literal("prompts/list")
});

server.setRequestHandler(PromptsListSchema, async () => {
  return { prompts: [] };
});

// --- Run the Server ---

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Simple MCP Server running on stdio"); // Log to stderr
  console.error("Posts storage initialized. Ready to handle requests.");
}

runServer().catch((error) => {
  console.error("Fatal error running simple MCP server:", error); // Log to stderr
  process.exit(1);
});
