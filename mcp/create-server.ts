import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { filterCatalogExercises } from "../lib/exercise-catalog";
import { getSessionById, listRecentCompletedSessions } from "./firestore";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/** Shared read-only tool set for stdio and HTTP MCP, scoped to one Firebase uid. */
export function createBuiltDailyServer(uid: string): McpServer {
  const server = new McpServer({
    name: "built-daily",
    version: "0.1.0",
  });

  server.registerTool(
    "list_recent_sessions",
    {
      title: "List recent sessions",
      description:
        "List the most recent completed workout sessions for the authenticated user.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(40)
          .optional()
          .describe("How many completed sessions to return (default 10)."),
      }),
      annotations: readOnly,
    },
    async ({ limit }) => {
      try {
        const result = await listRecentCompletedSessions(uid, limit ?? 10);
        return textResult(result);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "get_session",
    {
      title: "Get session",
      description:
        "Fetch one workout session by id for the authenticated user, including exercises and sets.",
      inputSchema: z.object({
        sessionId: z.string().min(1).describe("Firestore session document id."),
      }),
      annotations: readOnly,
    },
    async ({ sessionId }) => {
      try {
        const session = await getSessionById(uid, sessionId.trim());
        if (!session) {
          return errorResult(`Session not found: ${sessionId}`);
        }
        return textResult(session);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "search_exercises",
    {
      title: "Search exercises",
      description:
        "Search the in-memory exercise catalog by name, id, or muscle group. No Firestore.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Name, id, or muscle group (e.g. bench, chest). Empty returns the full catalog.",
          ),
      }),
      annotations: readOnly,
    },
    async ({ query }) => {
      const exercises = filterCatalogExercises(query).map((ex) => ({
        id: ex.id,
        name: ex.name,
        metric: ex.metric,
        primary: ex.primary ?? null,
        secondary: ex.secondary ?? [],
      }));
      return textResult({ query, count: exercises.length, exercises });
    },
  );

  return server;
}
