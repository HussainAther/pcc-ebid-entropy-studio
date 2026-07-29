import type { ResearchWorkspace } from "../models/research";
import { pccWorkspace } from "./research";

export type WorkspaceAvailability = "available" | "planned";

export interface WorkspaceRegistryEntry {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  availability: WorkspaceAvailability;
  workspace?: ResearchWorkspace;
}

export const workspaceRegistry: WorkspaceRegistryEntry[] = [
  {
    id: pccWorkspace.id,
    label: "PCC / EBID",
    shortLabel: "PCC",
    description: "Unified EBID research program across theory, simulation, ML, and training repositories",
    availability: "available",
    workspace: pccWorkspace,
  },
];

export const defaultWorkspaceId = pccWorkspace.id;

export function getWorkspace(id: string): ResearchWorkspace {
  const entry = workspaceRegistry.find(item => item.id === id && item.workspace);
  return entry?.workspace ?? pccWorkspace;
}
