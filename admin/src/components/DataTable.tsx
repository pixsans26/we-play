"use client";

import { useState } from "react";
import { Trash2, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { useConfirm } from "./ConfirmProvider";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  onDelete: (id: string | number) => void;
  onEdit?: (row: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string | number }>({
  data, columns, onDelete, onEdit, emptyMessage = "No records found."
}: Props<T>) {
  const confirm = useConfirm();

  // Sorting stater
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(key);
      setSortAsc(true);
    }
  };

  const sortedData = [...data].sort((a: any, b: any) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol];
    const bVal = b[sortCol];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return sortAsc ? 1 : -1;
    if (bVal === null || bVal === undefined) return sortAsc ? -1 : 1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    onClick={() => handleSort(String(col.key))}
                    className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortCol === String(col.key) && (
                        sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {columns.map(col => (
                      <td key={String(col.key)} className="px-6 py-4 text-sm text-slate-700">
                        {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <button onClick={() => onEdit(row)}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={async () => {
                            const ok = await confirm({
                              title: "Confirm Deletion",
                              message: "Are you sure you want to delete this item? This action cannot be undone.",
                              confirmText: "Delete",
                              cancelText: "Cancel"
                            });
                            if (ok) onDelete(row.id);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </>
  );
}
