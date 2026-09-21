import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { filterCatalogExercises } from "../lib/exercise-catalog";
import {
  createWorkoutSession,
  getSessionById,
  listRecentCompletedSessions,
  updateWorkoutSession,
} from "./firestore";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/** Creates new documents; doesn't overwrite/lose existing data. */
const write = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

/** Can overwrite/lose existing data (e.g. replacing the exercise list). */
const writeDestructive = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
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

const setInputSchema = z.object({
  weight: z
    .number()
    .optional()
    .describe("Weight used, for weighted exercises."),
  reps: z.number().int().optional().describe("Reps performed."),
  durationSec: z
    .number()
    .int()
    .optional()
    .describe("Duration in seconds, for timed or cardio exercises."),
  distanceMiles: z
    .number()
    .optional()
    .describe("Distance in miles, for cardio exercises."),
  paceMph: z.number().optional().describe("Pace in mph, for cardio exercises."),
  inclinePercent: z
    .number()
    .optional()
    .describe("Treadmill incline percent, for cardio exercises."),
  resistanceLevel: z
    .number()
    .optional()
    .describe("Resistance level, for cardio exercises."),
  note: z.string().max(200).optional().describe("Note for this set."),
});

const exerciseInputSchema = z.object({
  exerciseId: z
    .string()
    .min(1)
    .describe("Catalog exercise id — look it up first with search_exercises."),
  note: z.string().max(400).optional().describe("Note for this exercise."),
  sets: z
    .array(setInputSchema)
    .max(40)
    .describe(
      "Sets performed, in order. Only the fields relevant to the exercise's metric are kept (e.g. weight+reps for weight_reps, duration+pace for cardio).",
    ),
});

const commonSessionFields = {
  title: z
    .string()
    .max(200)
    .optional()
    .describe('Workout title. Defaults to "Workout on <date>" when omitted.'),
  status: z
    .enum(["completed", "in_progress"])
    .optional()
    .describe('Defaults to "completed".'),
  workoutDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Journal calendar day, YYYY-MM-DD."),
  workoutTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
    .describe("Local clock time, HH:mm (24h)."),
  workoutNote: z.string().max(500).optional().describe("Overall workout note."),
  startedAt: z
    .string()
    .datetime()
    .optional()
    .describe("ISO instant the workout started. Defaults to now."),
  endedAt: z
    .string()
    .datetime()
    .optional()
    .describe(
      "ISO instant the workout ended. Defaults to now for completed sessions; ignored for in_progress.",
    ),
};

/** Shared read-only + write tool set for stdio and HTTP MCP, scoped to one Firebase uid. */
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

  server.registerTool(
    "create_workout_session",
    {
      title: "Create workout session",
      description:
        'Log a new workout for the authenticated user. Defaults to a completed session ending now — pass status: "in_progress" to start one instead. Look up exerciseIds with search_exercises first.',
      inputSchema: z.object({
        ...commonSessionFields,
        exercises: z
          .array(exerciseInputSchema)
          .max(40)
          .optional()
          .describe(
            "Exercises performed, in order. Omit (or leave empty) for a session logged without details.",
          ),
      }),
      annotations: write,
    },
    async (input) => {
      try {
        const result = await createWorkoutSession(uid, input);
        if (result.kind === "unknown_exercise_ids") {
          return errorResult(
            `Unknown exerciseId(s): ${result.exerciseIds.join(", ")}. Use search_exercises to find valid ids.`,
          );
        }
        return textResult(result.session);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "update_workout_session",
    {
      title: "Update workout session",
      description:
        "Edit an existing workout session for the authenticated user. Only fields you provide are changed. " +
        "`exercises`, if provided, REPLACES the full exercise/set list for this session — call get_session " +
        "first if you need to preserve existing entries and merge them yourself.",
      inputSchema: z.object({
        sessionId: z.string().min(1).describe("Firestore session document id."),
        ...commonSessionFields,
        exercises: z
          .array(exerciseInputSchema)
          .max(40)
          .optional()
          .describe(
            "Full replacement exercise/set list, if changing exercises.",
          ),
      }),
      annotations: writeDestructive,
    },
    async ({ sessionId, ...rest }) => {
      try {
        const result = await updateWorkoutSession(uid, sessionId.trim(), rest);
        if (result.kind === "not_found") {
          return errorResult(`Session not found: ${sessionId}`);
        }
        if (result.kind === "unknown_exercise_ids") {
          return errorResult(
            `Unknown exerciseId(s): ${result.exerciseIds.join(", ")}. Use search_exercises to find valid ids.`,
          );
        }
        return textResult(result.session);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  return server;
}
