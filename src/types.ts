export type Port = 'top' | 'bottom' | 'left' | 'right';
export type Protection = 'unknown' | 'none' | 'tls' | 'vpn' | 'other';
export interface ProjectMeta { docTitle: string; version: string; date: string; author: string; reviewer: string; }
export interface Revision { id: string; version: string; date: string; author: string; desc: string; }
export interface DiagramTab { id: string; name: string; nodes: FlowNode[]; flows: DataFlow[]; }
export interface Warning { level: 'warn' | 'info'; nodeId?: string; flowId?: string; message: string; }
export type InfoNodeKind = 'external' | 'process' | 'system' | 'store';
export type Classification = 'unknown' | 'public' | 'internal' | 'confidential' | 'restricted';
export interface FlowNode { id: string; kind: InfoNodeKind; name: string; owner: string; zone: string; description: string; x: number; y: number; }
export interface DataFlow { id: string; from: string; to: string; sourceHandle: Port | null; targetHandle: Port | null; name: string; dataItems: string[]; purpose: string; classification: Classification; transport: string; frequency: string; protection: Protection; protectionNote: string; notes: string; }
export interface Project { app: 'infoflow'; schema: 1; meta: ProjectMeta; revisions: Revision[]; tabs: DiagramTab[]; activeTabId: string; }
