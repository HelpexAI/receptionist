"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Bike,
  MapPin,
  Phone,
  MessageSquare,
  Navigation,
  CheckCircle2,
  Clock,
  RefreshCw,
  Lock,
  Volume2,
  VolumeX,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Package,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  RestaurantOrder,
  verifyKitchenPin,
  getRiderOrders,
  updateRiderOrderStatus,
} from "@/lib/api";
import ConfirmationModal from "./ConfirmationModal";

interface RiderPortalProps {
  initialSlug?: string;
  initialPin?: string;
  embedded?: boolean;
}

// Synthesizer chime for new delivery assignments
function playRiderAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25); // C6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);

    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {
    // Audio may be blocked until user interacts
  }
}

export default function RiderPortal({ initialSlug, initialPin, embedded = false }: RiderPortalProps) {
  // Authentication & Rider Identity
  const [slug, setSlug] = useState<string>(initialSlug || "");
  const [pin, setPin] = useState<string>("");
  const [riderName, setRiderName] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setStatusToast({ msg, type });
    setTimeout(() => setStatusToast(null), 3500);
  };

  // Global Confirmation Modal State
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

  // Sound & Live Time
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>("");
  const previousOrdersCountRef = useRef<number>(0);

  // Active View Tab: 'active' | 'history'
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // Keep clock running
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize slug from URL params or sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const qSlug = urlParams.get("slug");
      const storedSlug = sessionStorage.getItem("rider_slug");
      const storedPin = sessionStorage.getItem("rider_pin");
      const storedRiderName = sessionStorage.getItem("rider_name");

      const resolvedSlug = qSlug || initialSlug || storedSlug || "";
      const resolvedPin = initialPin || storedPin || "";
      if (resolvedSlug) {
        setSlug(resolvedSlug);
      }
      if (storedRiderName) {
        setRiderName(storedRiderName);
      }
      if (resolvedSlug && resolvedPin) {
        setPin(resolvedPin);
        verifyPinAndLoad(resolvedSlug, resolvedPin);
      }
    }
  }, [initialSlug, initialPin]);

  const verifyPinAndLoad = async (targetSlug: string, targetPin: string) => {
    setVerifyingPin(true);
    setPinError(null);
    try {
      const res = await verifyKitchenPin(targetPin, targetSlug, "rider");
      if (res.success) {
        setIsAuthenticated(true);
        setRestaurantName(res.business_name || targetSlug);
        sessionStorage.setItem("rider_slug", targetSlug);
        sessionStorage.setItem("rider_pin", targetPin);
        if (riderName) sessionStorage.setItem("rider_name", riderName);
        await loadRiderOrders(targetSlug, targetPin);
      }
    } catch (err: any) {
      setPinError(err?.message || "Invalid PIN. Please check your restaurant code.");
      setIsAuthenticated(false);
    } finally {
      setVerifyingPin(false);
    }
  };

  const loadRiderOrders = useCallback(
    async (targetSlug: string, targetPin: string, isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      try {
        const fetched = await getRiderOrders(targetSlug, targetPin);
        setOrders(fetched);

        // Chime on new ready delivery order
        const activeReadyCount = fetched.filter(
          (o) => o.status === "ready" || o.status === "out_for_delivery"
        ).length;
        if (
          isSilent &&
          activeReadyCount > previousOrdersCountRef.current &&
          soundEnabled
        ) {
          playRiderAlertChime();
        }
        previousOrdersCountRef.current = activeReadyCount;
      } catch (err) {
        console.error("Failed to load rider orders:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [soundEnabled]
  );

  // Poll orders every 6 seconds
  useEffect(() => {
    if (!isAuthenticated || !slug || !pin) return;
    const interval = setInterval(() => {
      loadRiderOrders(slug, pin, true);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAuthenticated, slug, pin, loadRiderOrders]);

  // Handle Rider Status Update Action (only reached and delivered as requested)
  const handleRiderStatusUpdate = async (
    order: RestaurantOrder,
    targetStatus: "reached" | "delivered"
  ) => {
    setUpdatingOrderId(order.id);
    try {
      const updated = await updateRiderOrderStatus(
        order.id,
        slug,
        pin,
        targetStatus,
        riderName || undefined
      );
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (soundEnabled) {
        playRiderAlertChime();
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to update delivery status", "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Confirm before updating delivery status
  const promptRiderStatusUpdate = (
    order: RestaurantOrder,
    targetStatus: "reached" | "delivered"
  ) => {
    const isReached = targetStatus === "reached";
    const title = isReached
      ? `Confirm Arrival at Customer Location?`
      : `Complete Delivery #${order.order_number}?`;
    const message = isReached
      ? `Confirm you have reached ${order.customer_name}'s address? Customer will be notified on WhatsApp.`
      : `Confirm food delivered and total payment of Rs. ${Number(order.total_amount).toFixed(0)} was collected.`;
    const confirmLabel = isReached ? "Yes, I Have Reached" : "Confirm Delivery Complete";
    const variant: "amber" | "emerald" = isReached ? "amber" : "emerald";

    setConfirmModal({
      isOpen: true,
      title,
      message,
      details: (
        <div className="space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Customer: <strong className="text-white">{order.customer_name}</strong></span>
            <span className="font-bold text-emerald-400">Rs. {Number(order.total_amount).toFixed(0)}</span>
          </div>
          {order.delivery_address && (
            <p className="text-[11px] text-slate-400 leading-tight">
              📍 {order.delivery_address}
            </p>
          )}
          {order.customer_phone && (
            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              Tel: {order.customer_phone}
            </p>
          )}
        </div>
      ),
      confirmLabel,
      variant,
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        await handleRiderStatusUpdate(order, targetStatus);
        setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
      },
    });
  };

  const promptLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: "Exit Rider Portal?",
      message: "Are you sure you want to sign out from this device? You will need to re-enter your Rider PIN to log back in.",
      confirmLabel: "Sign Out",
      variant: "danger",
      onConfirm: () => {
        setIsAuthenticated(false);
        setPin("");
        sessionStorage.removeItem("rider_pin");
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Filter orders for active delivery queue vs delivered history
  const activeOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === "ready" ||
        o.status === "out_for_delivery" ||
        o.status === "reached"
    );
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === "delivered" ||
        o.status === "picked_up" ||
        o.status === "completed"
    );
  }, [orders]);

  // Clean phone number for tel: and wa.me: links
  const getCleanPhone = (phoneStr: string) => {
    let digits = (phoneStr || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.substring(2);
    else if (digits.startsWith("0")) digits = "92" + digits.substring(1);
    else if (digits.length === 10 && digits.startsWith("3")) digits = "92" + digits;
    return digits;
  };

  // Google Maps navigation URL
  const getMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  };

  // ==================== SCREEN 1: PIN AUTHENTICATION ====================
  if (!isAuthenticated) {
    return (
      <div className={`${embedded ? "flex-1 flex flex-col items-center justify-center p-4 bg-[#070A10]" : "min-h-screen bg-[#070A10] text-white flex flex-col items-center justify-center p-4 selection:bg-cyan-500"}`}>
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0D121F] border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500 text-black flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30">
              <Bike className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white font-sans">
              Rider Delivery App
            </h1>
            <p className="text-xs text-slate-400">
              Instant mobile portal for dispatch &amp; delivery updates
            </p>
          </div>

          {/* Restaurant Slug Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Restaurant Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="e.g. tiwana-restraunt"
              className="w-full px-4 py-3 rounded-xl bg-[#141A29] border border-slate-700/80 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Rider Name (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Your Name / Bike # (Optional)
            </label>
            <input
              type="text"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. Ali - Bike 2"
              className="w-full px-4 py-3 rounded-xl bg-[#141A29] border border-slate-700/80 text-white font-sans text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* 4-digit PIN */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Staff / Kitchen PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full py-3 text-center text-2xl font-mono tracking-widest rounded-xl bg-[#141A29] border border-slate-700/80 text-cyan-400 focus:border-cyan-500 focus:outline-none"
            />
            {pinError && (
              <p className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="button"
            disabled={verifyingPin || pin.length < 4 || !slug.trim()}
            onClick={() => verifyPinAndLoad(slug, pin)}
            className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-98 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
          >
            {verifyingPin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            <span>Open Rider Portal</span>
          </button>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 2: MOBILE-FIRST RIDER PORTAL ====================
  return (
    <div className={`${embedded ? "flex-1 flex flex-col bg-[#070A10] text-slate-100 select-none overflow-y-auto" : "min-h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans select-none selection:bg-cyan-500"}`}>
      {/* ==================== STICKY MOBILE TOP BAR ==================== */}
      <header className="sticky top-0 z-40 bg-[#0E1424] border-b-2 border-slate-800 px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500 text-black flex items-center justify-center font-bold shadow-md shadow-cyan-500/20">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black uppercase tracking-tight text-white font-mono truncate max-w-[160px]">
                {restaurantName || slug}
              </h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-cyan-500 text-black">
                RIDER
              </span>
            </div>
            <p className="text-[10px] text-cyan-300 font-medium">
              {riderName ? `Rider: ${riderName}` : "Delivery Fleet"}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-[#141A29] hover:bg-[#1C253B] border border-slate-700 text-slate-300 text-xs transition-colors"
            title="Toggle Alert Sounds"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadRiderOrders(slug, pin)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-[#141A29] hover:bg-[#1C253B] border border-slate-700 text-slate-300 text-xs transition-colors disabled:opacity-50"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Lock / Exit */}
          <button
            type="button"
            onClick={promptLogout}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Lock Portal"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==================== ACTIVE VS HISTORY TABS ==================== */}
      <div className="px-4 py-2 bg-[#0A0E1A] border-b border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "active"
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              : "bg-[#121726] text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Active Orders ({activeOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "history"
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              : "bg-[#121726] text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Delivered Today ({historyOrders.length})</span>
        </button>
      </div>

      {/* ==================== ORDERS LIST (MOBILE FIRST) ==================== */}
      <main className="flex-1 p-3 sm:p-4 max-w-xl w-full mx-auto space-y-3 overflow-y-auto">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-xs font-mono">Loading delivery orders...</p>
          </div>
        ) : activeTab === "active" && activeOrders.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-[#101524] border border-slate-800 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
              <Bike className="w-8 h-8 opacity-70" />
            </div>
            <h3 className="text-base font-bold text-white">No Active Delivery Orders</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Once an order finishes cooking in the kitchen, it will automatically appear here!
            </p>
          </div>
        ) : activeTab === "history" && historyOrders.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-[#101524] border border-slate-800 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 opacity-70" />
            </div>
            <h3 className="text-base font-bold text-white">No Delivered Orders Yet</h3>
            <p className="text-xs text-slate-400">
              Completed deliveries for your shift will be listed here.
            </p>
          </div>
        ) : (
          (activeTab === "active" ? activeOrders : historyOrders).map((order) => {
            const isUpdating = updatingOrderId === order.id;
            const isReady = order.status === "ready" || order.status === "out_for_delivery";
            const isReached = order.status === "reached";
            const isDelivered =
              order.status === "delivered" ||
              order.status === "picked_up" ||
              order.status === "completed";

            const cleanPhone = getCleanPhone(order.customer_phone);

            return (
              <div
                key={order.id}
                className={`rounded-2xl border-2 overflow-hidden shadow-xl transition-all ${
                  isReached
                    ? "bg-[#10191B] border-amber-500 shadow-amber-950/30"
                    : isReady
                    ? "bg-[#0E1526] border-cyan-500/80 shadow-cyan-950/30"
                    : "bg-[#0E1815] border-emerald-500/60"
                }`}
              >
                {/* Order Top Bar */}
                <div className="p-3.5 border-b border-slate-800 bg-[#12192C] flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black font-mono text-white tracking-tight">
                      {order.order_number || `#${order.id.slice(0, 6).toUpperCase()}`}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {new Date(order.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Cash to Collect Badge */}
                  <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase font-mono block">Cash to Collect</span>
                    <span className="text-base font-black font-mono text-emerald-400">
                      Rs. {Number(order.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Customer Details & Quick Touch Action Bar */}
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-black text-white">
                        {order.customer_name || "Customer"}
                      </h4>
                      {/* Status chip */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                          isReached
                            ? "bg-amber-500 text-black animate-pulse"
                            : isReady
                            ? "bg-cyan-500 text-black"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        {isReached ? "📍 At Location" : isReady ? "🛵 On The Way" : "✓ Delivered"}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-slate-400">
                      📞 {order.customer_phone}
                    </p>
                  </div>

                  {/* One-Touch Call & WhatsApp Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                      <span>Call Customer</span>
                    </a>

                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                        `Salam ${order.customer_name}! Main aapka order #${order.order_number} deliver karne ke liye pohanch raha hoon.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  {/* Delivery Address & Google Maps Navigation */}
                  {order.delivery_address && (
                    <div className="p-3 rounded-xl bg-[#141B2B] border border-slate-700/80 space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                          {order.delivery_address}
                        </p>
                      </div>

                      <a
                        href={getMapsUrl(order.delivery_address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                      >
                        <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Navigate in Google Maps</span>
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                      </a>
                    </div>
                  )}

                  {/* Ordered Items Summary */}
                  <div className="p-2.5 rounded-xl bg-[#111726] border border-slate-800 space-y-1.5 font-mono text-xs">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                      Order Items:
                    </span>
                    <div className="space-y-1 divide-y divide-slate-800">
                      {(order.items || []).map((it, idx) => (
                        <div key={idx} className="pt-1 first:pt-0 flex items-center justify-between">
                          <span className="text-slate-200">
                            <strong className="text-cyan-400">{it.quantity}x</strong> {it.name}
                            {it.variant && <span className="text-slate-400 text-[10px]"> ({it.variant})</span>}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            Rs. {Number(it.subtotal || it.price * it.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Note */}
                  {order.special_instructions && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300">
                      ⚠️ Note: {order.special_instructions}
                    </div>
                  )}
                </div>

                {/* Card Bottom: Big Thumb Actions */}
                {/* USER CONSTRAINT: "rider can only set its status to reached and then to delivered" */}
                {activeTab === "active" && (
                  <div className="p-3 border-t-2 border-slate-800 bg-[#0F1524]">
                    {isReady && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => promptRiderStatusUpdate(order, "reached")}
                        className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <MapPin className="w-5 h-5" />
                        )}
                        <span>📍 I HAVE REACHED (CUSTOMER LOCATION)</span>
                      </button>
                    )}

                    {isReached && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => promptRiderStatusUpdate(order, "delivered")}
                        className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                        <span>✅ MARK AS DELIVERED</span>
                      </button>
                    )}
                  </div>
                )}

                {isDelivered && (
                  <div className="p-3 border-t border-slate-800 bg-[#0C1412] flex items-center justify-center gap-2 text-emerald-400 font-black text-xs uppercase font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Delivered Successfully &bull; Rs. {Number(order.total_amount).toFixed(0)} Collected</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Floating Status Toast */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
              statusToast.type === "error"
                ? "bg-rose-950/95 text-rose-200 border-rose-800"
                : "bg-emerald-950/95 text-emerald-200 border-emerald-800"
            }`}
          >
            {statusToast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusToast.msg}</span>
          </div>
        </div>
      )}

      {/* Global Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
