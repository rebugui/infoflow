import { useState } from "react";
import type { DataFlow, FlowNode, InfoNodeKind, Classification, Protection } from "../types";
import { kindDefs, classificationLabels, protectionLabels } from "../lib/nodeTypes";
import { defaultFlow, splitItems } from "../lib/defaults";

type NodeAttributes = Omit<FlowNode, "id" | "x" | "y">;
export function NodeForm({ initial, onSave, submitLabel = "구성 요소 추가" }: {
  initial?: FlowNode;
  onSave: (node: NodeAttributes) => void;
  submitLabel?: string;
}) {
  const [kind, setKind] = useState<InfoNodeKind | "">(initial?.kind ?? "");
  const [draft, setDraft] = useState({ name: initial?.name ?? "", owner: initial?.owner ?? "", zone: initial?.zone ?? "", description: initial?.description ?? "" });
  return <form className="form" onSubmit={(event) => {
    event.preventDefault();
    if (!kind || !draft.name.trim()) return;
    onSave({ ...draft, name: draft.name.trim(), kind });
  }}>
    <label>이름 (필수)<input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
    <label>종류 (필수)<select required value={kind} onChange={(e) => setKind(e.target.value as InfoNodeKind | "")}>
      <option value="">종류 선택</option>
      {Object.entries(kindDefs).map(([value, def]) => <option key={value} value={value}>{def.label}</option>)}
    </select></label>
    <label>담당자<input value={draft.owner} placeholder="미지정" onChange={(e) => setDraft({ ...draft, owner: e.target.value })} /></label>
    <label>보안영역<input value={draft.zone} placeholder="미지정" onChange={(e) => setDraft({ ...draft, zone: e.target.value })} /></label>
    <label>설명<textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
    <button className="primary" type="submit">{submitLabel}</button>
  </form>;
}

export function FlowForm({ initial, nodes, onSave, submitLabel = "정보 흐름 추가" }: {
  initial?: DataFlow;
  nodes: FlowNode[];
  onSave: (flow: Omit<DataFlow, "id">) => void;
  submitLabel?: string;
}) {
  const [draft, setDraft] = useState<Omit<DataFlow, "id">>(() => initial ? {
    from: initial.from, to: initial.to, sourceHandle: initial.sourceHandle, targetHandle: initial.targetHandle,
    name: initial.name, dataItems: initial.dataItems, purpose: initial.purpose, classification: initial.classification,
    transport: initial.transport, frequency: initial.frequency, protection: initial.protection,
    protectionNote: initial.protectionNote, notes: initial.notes,
  } : defaultFlow("", ""));
  const [items, setItems] = useState(initial?.dataItems.join("\n") ?? "");
  return <form className="form" onSubmit={(event) => {
    event.preventDefault();
    if (!draft.name.trim() || !nodes.some((n) => n.id === draft.from) || !nodes.some((n) => n.id === draft.to)) return;
    onSave({ ...draft, name: draft.name.trim(), dataItems: splitItems(items) });
  }}>
    {([['from', '출발'], ['to', '도착']] as const).map(([key, label]) => <label key={key}>{label} 구성 요소 (필수)
      <select required value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value, [key === 'from' ? 'sourceHandle' : 'targetHandle']: null })}>
        <option value="">구성 요소 선택</option>
        {nodes.map((node) => <option key={node.id} value={node.id}>{node.name || "미지정"}</option>)}
      </select>
    </label>)}
    <label>흐름명 (필수)<input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
    <label>데이터 항목 (줄바꿈 또는 쉼표 구분)<textarea rows={4} value={items} placeholder="항목명만 입력하세요" onChange={(e) => setItems(e.target.value)} /></label>
    <label>목적<textarea rows={2} value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} /></label>
    <label>분류<select value={draft.classification} onChange={(e) => setDraft({ ...draft, classification: e.target.value as Classification })}>
      {Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <label>전송방식<input value={draft.transport} placeholder="미지정" onChange={(e) => setDraft({ ...draft, transport: e.target.value })} /></label>
    <label>주기<input value={draft.frequency} placeholder="미지정" onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} /></label>
    <label>보호조치<select value={draft.protection} onChange={(e) => setDraft({ ...draft, protection: e.target.value as Protection })}>
      {Object.entries(protectionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <label>보호조치 설명<textarea rows={2} value={draft.protectionNote} onChange={(e) => setDraft({ ...draft, protectionNote: e.target.value })} /></label>
    <label>메모<textarea rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label>
    <button className="primary" type="submit" disabled={!nodes.length}>{submitLabel}</button>
  </form>;
}
