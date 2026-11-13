"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, X, Trash2 } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  details?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "success" | "primary" | "emerald" | "amber" | "cyan";
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <Trash2 className="w-5 h-5 text-rose-500" />;
      case "warning":
      case "amber":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "success":
      case "emerald":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "cyan":
      case "primary":
      default:
        return <HelpCircle className="w-5 h-5 text-cyan-500" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case "danger":
        return "bg-rose-500/10 border-rose-500/20";
      case "warning":
      case "amber":
        return "bg-amber-500/10 border-amber-500/20";
      case "success":
      case "emerald":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "cyan":
        return "bg-cyan-500/10 border-cyan-500/20";
      case "primary":
      default:
        return "bg-blue-500/10 border-blue-500/20";
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case "danger":
        return "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30";
      case "warning":
      case "amber":
        return "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/30";
      case "success":
      case "emerald":
        return "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30";
      case "cyan":
        return "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30";
      case "primary":
      default:
        return "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#0F1523] border border-slate-800 p-5 shadow-2xl space-y-4 my-auto select-none">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getIconBg()}`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-base font-bold text-white tracking-tight leading-snug">
              {title}
            </h3>
            {message && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {message}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional Custom Details Body */}
        {details && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            {details}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              await onConfirm();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${getConfirmButtonClasses()}`}
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
