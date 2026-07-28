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
    description: "Entropy, instability, and cyclic dynamical systems",
    availability: "available",
    workspace: pccWorkspace,
  },
  {
    id: "workspace-strx",
    label: "STRX",
    shortLabel: "STRX",
    description: "Steerable ray-by-ray X-ray computed tomography",
    availability: "planned",
  },
  {
    id: "workspace-webar",
    label: "WebAR",
    shortLabel: "WebAR",
    description: "Browser-based augmented-reality experiments",
    availability: "planned",
  },
  {
    id: "workspace-ml",
    label: "ML Research",
    shortLabel: "ML",
    description: "Machine-learning experiments and evidence",
    availability: "planned",
  },
];

export const defaultWorkspaceId = pccWorkspace.id;

export function getWorkspace(id: string): ResearchWorkspace {
  const entry = workspaceRegistry.find(item => item.id === id && item.workspace);
  return entry?.workspace ?? pccWorkspace;
}
