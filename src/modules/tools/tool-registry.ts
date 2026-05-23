import type { ToolDefinition } from "./tool-types";
import runWorkflow from "./definitions/run-workflow";
import getReports from "./definitions/get-reports";
import sendEmail from "./definitions/send-email";
import searchDatabase from "./definitions/search-database";
import fetchUserData from "./definitions/fetch-user-data";
import generateInvoice from "./definitions/generate-invoice";
import createTask from "./definitions/create-task";

const registry = new Map<string, ToolDefinition>();

for (const tool of [
  runWorkflow,
  getReports,
  sendEmail,
  searchDatabase,
  fetchUserData,
  generateInvoice,
  createTask
]) {
  registry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(registry.values());
}

export function getToolsAsAiSchema(): Array<{
  name: string;
  description: string;
  input_schema: ToolDefinition["inputSchema"];
}> {
  return getAllTools().map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema
  }));
}
