import { useEffect, useRef } from 'react';
import { useCompactLayout } from '../hooks/useCompactLayout';
import { useUiStore } from '../store/useUiStore';
import { LeftPanel } from './LeftPanel';
import { Canvas } from './Canvas';
import { RightPanel } from './RightPanel';

const panels = [
  { id: 'canvas', label: '도면' },
  { id: 'left', label: '목록·추가' },
  { id: 'right', label: '속성·검토' },
] as const;

export function ResponsiveWorkspace() {
  const compact = useCompactLayout();
  const active = useUiStore((state) => state.mobilePanel);
  const select = useUiStore((state) => state.setMobilePanel);
  const regions = useRef<Record<string, HTMLElement | null>>({});
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    if (!compact) return;
    for (const panel of panels) {
      if (panel.id !== active && regions.current[panel.id]?.contains(document.activeElement)) {
        buttons.current[active]?.focus();
        break;
      }
    }
  }, [active, compact]);
  return <>
    <nav className="workspace-nav" aria-label="편집 화면" hidden={!compact}>
      {panels.map(({ id, label }) => <button key={id} ref={(node) => { buttons.current[id] = node; }}
        aria-controls={`workspace-${id}`} aria-pressed={active === id} onClick={() => select(id)}>{label}</button>)}
    </nav>
    <div className="workspace">
      <div id="workspace-left" className={`workspace-region ${active === 'left' ? 'active' : ''}`} ref={(node) => { regions.current.left = node; }} inert={compact && active !== 'left'} aria-hidden={compact && active !== 'left' || undefined}><LeftPanel /></div>
      <div id="workspace-canvas" className={`workspace-region ${active === 'canvas' ? 'active' : ''}`} ref={(node) => { regions.current.canvas = node; }} inert={compact && active !== 'canvas'} aria-hidden={compact && active !== 'canvas' || undefined}><Canvas /></div>
      <div id="workspace-right" className={`workspace-region ${active === 'right' ? 'active' : ''}`} ref={(node) => { regions.current.right = node; }} inert={compact && active !== 'right'} aria-hidden={compact && active !== 'right' || undefined}><RightPanel /></div>
    </div>
  </>;
}
