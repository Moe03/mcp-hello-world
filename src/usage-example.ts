import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt"; // Incorrect
// import { createAnthropicToolsAgent } from "@langchain/anthropic"; // Incorrect
// import { createAnthropicToolsAgent } from "langchain/agents/tool_calling"; // Try this path again
import { ChatPromptTemplate } from "@langchain/core/prompts";
// @ts-ignore
import dotenv from "dotenv";

dotenv.config();

async function runLangchainMcpExample() {
  console.log("Initializing LangChain with MCP Adapters...");

  const model = new ChatAnthropic({
    model: "claude-3-5-sonnet-20240620",
    temperature: 0,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Keep constructor with only mcpServers map
  const mcpClient = new MultiServerMCPClient({
    googleMapsServer: {
      // The server map directly
      transport: "sse",
      url: "http://localhost:8000/sse",
      useNodeEventSource: true,
      reconnect: {
        enabled: true,
        maxAttempts: 3,
        delayMs: 1000,
      },
    }
  });

  try {
    console.log("Loading tools from MCP server via Supergateway...");
    // Keep getTools call with options
    const tools = await mcpClient.getTools();

    if (tools.length === 0) {
      console.error("No tools were loaded...");
      await mcpClient.close();
      return;
    }

    console.log(
      `Loaded ${tools.length} tools:`,
      tools.map((t) => t.name).join(", ")
    );

    const agent = await createReactAgent({
      llm: model,
      tools,
    });

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful assistant. Use tools to answer user questions.",
      },
      {
        role: "user",
        content: `What is the current weather in San Francisco?`,
      },
    ];
    let inputs = { messages };
    // console.log(`ALL GOOD NOW TART EVEN STREAMM>>!: `, inputs);
    // await new Promise((resolve) => setImmediate(resolve));
    const eventStream = await agent.streamEvents(inputs, {
      version: "v2",
      //  signal: localController.signal, // <--- critical to pass localController!
    });

    // --- Invocation remains the same ---
    for await (const event of eventStream) {
      if (event.event === "on_chat_model_stream") {
        console.log("Chat model stream");
        console.log(event.data.chunk.content[0]?.text);
      } else if (event.event === "on_tool_start") {
        console.log("Tool start");
        console.log(JSON.stringify(event, null, 2));
      } else if (event.event === "on_tool_end") {
        console.log("Tool end");
        console.log(JSON.stringify(event, null, 2));
      }
    }
  } catch (error) {
    console.error(
      "\nAn error occurred during the LangChain MCP example:",
      error
    );
    if (error instanceof Error && error.name === "ToolException") {
      console.error("Tool execution failed:", error.message);
    }
  } finally {
    console.log("\nClosing MCP client connections...");
    await mcpClient.close();
    console.log("MCP client closed.");
  }
}

runLangchainMcpExample().catch(console.error);
