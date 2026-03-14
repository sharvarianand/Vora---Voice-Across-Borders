import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
} from "@xyflow/react";
import { nanoid } from "nanoid";

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  loadWorkflow: (nodes: Node[], edges: Edge[]) => void;
  clear: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge({ ...connection, id: `e-${nanoid(8)}` }, get().edges),
    });
  },

  addNode: (type, position) => {
    const defaultData: Record<string, Record<string, unknown>> = {
      start: {},
      send_email: { prompt: "", mode: "personalized" },
      send_whatsapp: { prompt: "", mode: "personalized" },
      wait: { duration: 1, unit: "days" },
      condition: { check: "replied" },
      auto_reply: { tone_prompt: "", use_product_context: true, use_campaign_context: true },
      end: {},
    };

    const newNode: Node = {
      id: nanoid(8),
      type,
      position,
      data: defaultData[type] || {},
    };

    set({ nodes: [...get().nodes, newNode] });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  loadWorkflow: (nodes, edges) => set({ nodes, edges }),

  clear: () => set({ nodes: [], edges: [] }),
}));
