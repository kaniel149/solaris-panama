import React, { useState, useCallback, useRef } from 'react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface KanbanColumn<T> {
  id: string;
  title: string;
  color?: string;
  items: T[];
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T, columnId: string) => React.ReactNode;
  getItemId: (item: T) => string;
  onMove?: (itemId: string, fromColumn: string, toColumn: string) => void;
  className?: string;
}

export function KanbanBoard<T>({
  columns,
  renderCard,
  getItemId,
  onMove,
  className,
}: KanbanBoardProps<T>) {
  const [dragItem, setDragItem] = useState<{ id: string; fromColumn: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragCounters = useRef<Record<string, number>>({});

  const handleDragStart = useCallback(
    (e: React.DragEvent, itemId: string, columnId: string) => {
      setDragItem({ id: itemId, fromColumn: columnId });
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', itemId);
      // Make the drag image slightly transparent
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = '0.5';
      }
    },
    []
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDragItem(null);
    setDropTarget(null);
    dragCounters.current = {};
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    dragCounters.current[columnId] = (dragCounters.current[columnId] || 0) + 1;
    setDropTarget(columnId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    dragCounters.current[columnId] = (dragCounters.current[columnId] || 0) - 1;
    if (dragCounters.current[columnId] <= 0) {
      dragCounters.current[columnId] = 0;
      setDropTarget((prev) => (prev === columnId ? null : prev));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      if (dragItem && dragItem.fromColumn !== columnId) {
        onMove?.(dragItem.id, dragItem.fromColumn, columnId);
      }
      setDragItem(null);
      setDropTarget(null);
      dragCounters.current = {};
    },
    [dragItem, onMove]
  );

  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {columns.map((col) => {
        const isOver = dropTarget === col.id && dragItem?.fromColumn !== col.id;
        return (
          <div
            key={col.id}
            className={cn(
              'flex flex-col w-72 shrink-0 rounded-xl bg-[#12121a]/50 border transition-all duration-200',
              isOver
                ? 'border-[#00ffcc]/30 shadow-[0_0_20px_rgba(0,255,204,0.08)]'
                : 'border-white/[0.06]'
            )}
            onDragEnter={(e) => handleDragEnter(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                {col.color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                )}
                <span className="text-sm font-medium text-[#f0f0f5]">{col.title}</span>
              </div>
              <span className="text-xs font-medium text-[#555566] bg-white/[0.04] px-2 py-0.5 rounded-full">
                {col.items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-3 min-h-[120px]">
              {col.items.map((item) => {
                const itemId = getItemId(item);
                return (
                  <div
                    key={itemId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, itemId, col.id)}
                    onDragEnd={handleDragEnd}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {renderCard(item, col.id)}
                  </div>
                );
              })}
              {isOver && (
                <div className="h-16 rounded-lg border-2 border-dashed border-[#00ffcc]/20 bg-[#00ffcc]/[0.02]" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
