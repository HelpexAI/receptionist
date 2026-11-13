"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Unlink,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Radio,
  RotateCcw,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import {
  getWhatsAppStatus,
  getWhatsAppQR,
  disconnectWhatsApp,
  resetWhatsApp,
  WhatsAppStatusResponse,
} from "@/lib/api";
import ConfirmationModal from "@/src/components/ConfirmationModal";

interface WhatsAppConnectCardProps {
  variant?: "clinic" | "restaurant";
}

export default function WhatsAppConnectCard({ variant = "clinic" }: WhatsAppConnectCardProps) {
  const [status, setStatus] = useState<string>("UNKNOWN");
  const [sessionName, setSessionName] = useState<string>("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingQR, setLoadingQR] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    details?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "success" | "primary" | "emerald" | "amber" | "cyan";
    onConfirm: () => Promise<void> | void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: "",
    onConfirm: () => {},
  });

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const isClinic = variant === "clinic";

  // Accent color variables based on variant
  const accentIconBg = isClinic
    ? "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/50"
    : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50";

  const accentBadge = isClinic
    ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60"
    : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";

  const accentButton = isClinic
    ? "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20"
    : "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20";

  // Fetch current connection status
  const checkStatus = useCallback(async (): Promise<string> => {
    try {
      const res: WhatsAppStatusResponse = await getWhatsAppStatus();
      if (!isMountedRef.current) return res.status;

      setStatus(res.status);
      setSessionName(res.session);
      setLastUpdated(new Date());

      if (res.connected || res.status === "WORKING") {
        setQrCode(null);
        setError(null);
      }
      return res.status;
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn("[WAHA Status Check]", err?.message || err);
      }
      return "UNKNOWN";
    }
  }, []);

  // Fetch fresh QR code
  const fetchQR = useCallback(async () => {
    try {
      setLoadingQR(true);
      setError(null);
      const res = await getWhatsAppQR();
      if (!isMountedRef.current) return;

      setStatus(res.status);
      if (res.connected || res.status === "WORKING") {
        setQrCode(null);
      } else {
        setQrCode(res.qr);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(
          err?.message ||
            "Unable to reach WhatsApp gateway. Ensure WAHA service is running."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingQR(false);
      }
    }
  }, []);

  // Force clean session reset and get a brand-new QR code
  const handleResetPairing = async () => {
    try {
      setResetting(true);
      setError(null);
      await resetWhatsApp();
      await fetchQR();
    } catch (err: any) {
      setError(err?.message || "Failed to reset WhatsApp pairing session.");
    } finally {
      setResetting(false);
    }
  };

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      setLoadingInitial(true);
      const currentStatus = await checkStatus();
      if (currentStatus !== "WORKING") {
        await fetchQR();
      }
      setLoadingInitial(false);
    };

    init();

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [checkStatus, fetchQR]);

  // Polling effect: polls every 3 seconds while NOT WORKING
  useEffect(() => {
    if (status === "WORKING") {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      const updatedStatus = await checkStatus();
      if (updatedStatus === "WORKING") {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    }, 3000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [status, checkStatus]);

  // Handle Disconnect
  const handleDisconnect = () => {
    setConfirmModal({
      isOpen: true,
      title: "Disconnect WhatsApp Gateway?",
      message:
        "Are you sure you want to disconnect this WhatsApp number? Automated replies and AI reception will pause until a device is linked again.",
      confirmLabel: "Yes, Disconnect",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          setDisconnecting(true);
          setError(null);
          await disconnectWhatsApp();
          setStatus("STOPPED");
          setQrCode(null);
          await fetchQR();
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          setError(err?.message || "Failed to disconnect WhatsApp session.");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setDisconnecting(false);
        }
      },
    });
  };

  const isConnected = status === "WORKING";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-7 space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${accentIconBg}`}>
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              WhatsApp Reception Automation
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Official Gateway
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Link your business WhatsApp via QR code for automated 24/7 AI reception, inquiries, and real-time booking.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {loadingInitial ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Checking Status...</span>
            </span>
          ) : isConnected ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>WhatsApp Connected &amp; AI Active</span>
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${accentBadge}`}>
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Ready for QR Scan</span>
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchQR}
            className="text-rose-700 dark:text-rose-300 hover:underline text-xs font-semibold cursor-pointer shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main State Views */}
      {loadingInitial ? (
        <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className={`w-8 h-8 animate-spin ${isClinic ? "text-teal-600" : "text-amber-600"}`} />
          <p className="text-xs font-medium">Connecting to WhatsApp Gateway Service...</p>
        </div>
      ) : isConnected ? (
        /* ==================== STATE 1: CONNECTED ==================== */
        <div className="space-y-6 animate-in fade-in">
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-emerald-200 dark:border-emerald-800/50 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  WhatsApp AI Receptionist is Live &amp; Automated
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Incoming patient/customer messages sent to your linked WhatsApp number are instantly processed by the AI Receptionist with bilingual Roman Urdu and English natural voice &amp; text processing, schedule checking, and automatic database confirmation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xl">
                <span className="text-slate-500 dark:text-slate-400">Gateway Session:</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">{sessionName || "Active"}</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xl">
                <span className="text-slate-500 dark:text-slate-400">Autonomous Booking:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Enabled &amp; Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need to change your WhatsApp phone number? Disconnect below and scan with your new device.
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Disconnecting...</span>
                </>
              ) : (
                <>
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect Number</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ==================== STATE 2: NOT CONNECTED / SCANNING ==================== */
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Instructions Column (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Follow these 3 quick steps to link your phone:
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pair your business WhatsApp Web session securely:
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${accentBadge}`}>
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Open WhatsApp on your mobile phone</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Launch WhatsApp or WhatsApp Business on your primary handset.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${accentBadge}`}>
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Navigate to: Settings &rarr; Linked Devices &rarr; Link a Device
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      On Android: Tap the 3-dots in top right. On iPhone: Tap Settings tab at bottom right.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${accentBadge}`}>
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Scan the QR code displayed on the right</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Point your phone's camera at the QR code. Pairing typically takes 3 to 5 seconds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status indicator line */}
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>
                  Status: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{status}</span> &bull; Auto-detecting scan every 3s
                </span>
              </div>

              {/* Troubleshooting Tips Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-xs">
                  <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>Connection Troubleshooting:</span>
                </div>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside pl-1">
                  <li>Ensure WhatsApp on your mobile phone is updated to the latest version.</li>
                  <li>Disable any active VPN or proxy on your mobile handset during pairing.</li>
                  <li>If you already have 4 linked devices, remove one before linking.</li>
                  <li>If pairing times out, click <strong>"Regenerate QR / Reset Pairing"</strong> below.</li>
                </ul>
              </div>
            </div>

            {/* QR Display Column (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center w-64 h-64">
                {loadingQR || resetting ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-300">
                    <Loader2 className={`w-8 h-8 animate-spin ${isClinic ? "text-teal-600" : "text-amber-600"}`} />
                    <span className="text-xs font-semibold">
                      {resetting ? "Resetting Handshake..." : "Generating Fresh QR..."}
                    </span>
                  </div>
                ) : qrCode ? (
                  <img
                    src={qrCode}
                    alt="WhatsApp Web QR Code"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-center p-4">
                    <QrCode className="w-10 h-10 text-slate-400" />
                    <span className="text-xs font-medium">
                      No active QR available. Click regenerate below to create one.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Refresh & Prominent Reset */}
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={handleResetPairing}
                  disabled={resetting || loadingQR}
                  title="Clears session state and creates a fresh QR pairing handshake"
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${accentButton}`}
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
                  <span>Regenerate QR</span>
                </button>

                <button
                  type="button"
                  onClick={fetchQR}
                  disabled={loadingQR || resetting}
                  title="Reload QR code image without resetting"
                  className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingQR ? "animate-spin text-teal-600" : ""}`} />
                  <span>Reload</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                QR codes refresh automatically every 20-30 seconds
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => {
          if (!confirmModal.isLoading) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      />
    </div>
  );
}
