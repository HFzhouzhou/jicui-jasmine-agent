import { BookOpen, FileText } from 'lucide-react';
import type { KnowledgeCitation } from '@shared/rag';

export function isKnowledgeCitation(value: unknown): value is KnowledgeCitation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && /^[1-6]$/.test(item.id)
    && ['documentId', 'documentTitle', 'source', 'excerpt'].every(key => typeof item[key] === 'string' && (item[key] as string).length <= (key === 'source' ? 1000 : key === 'excerpt' ? 600 : 200))
    && (item.page === undefined || (typeof item.page === 'number' && Number.isInteger(item.page) && item.page > 0))
    && (item.section === undefined || (typeof item.section === 'string' && item.section.length <= 180));
}

export default function KnowledgeSources({citations}: {citations: KnowledgeCitation[]}) {
  if (!citations.length) return null;
  return <details className="w-full min-w-0 rounded-2xl border border-[#dde5cd] bg-[#fafbf7] px-4 py-1 text-[#53624b]">
    <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs"><BookOpen className="size-3.5 shrink-0" />查看回答依据 · {citations.length} 处引用</summary>
    <div className="space-y-3 pb-3">{citations.map(item => <div key={item.id} className="min-w-0 rounded-xl bg-white p-3 [overflow-wrap:anywhere]">
      <p className="flex items-start gap-2 text-xs font-medium"><FileText className="mt-0.5 size-3.5 shrink-0" /><span>[{item.id}] {item.documentTitle}{item.page ? ` · 第 ${item.page} 页` : ''}</span></p>
      {item.section && <p className="mt-1 text-[11px] text-muted-foreground">{item.section}</p>}
      <blockquote className="my-2 border-l-2 border-[#cedabb] pl-3 text-xs leading-6 whitespace-pre-wrap">{item.excerpt}</blockquote>
      <p className="text-[10px] leading-5 text-muted-foreground">来源：{item.source}</p>
    </div>)}</div>
  </details>;
}
