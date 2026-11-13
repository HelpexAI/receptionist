"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ChefHat,
  Flame,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Lock,
  Truck,
  ShoppingBag,
  UtensilsCrossed,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Search,
  X,
  ChevronRight,
  ShieldCheck,
  Check,
  Eye,
} from "lucide-react";
import {
  RestaurantOrder,
  verifyKitchenPin,
  getKitchenOrders,
  updateKitchenOrderStatus,
} from "@/lib/api";
import ConfirmationModal from "./ConfirmationModal";

interface KitchenDisplayProps {
  initialSlug?: string;
  initialPin?: string;
  embedded?: boolean;
}

// Simple Web Audio API Synthesizer Chime for New Orders (no audio file required)
function playKitchenOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Pleasant two-tone kitchen order chime
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.frequency.setValueAtTime(587.33 * 0.5, now);
    osc2.frequency.exponentialRampToValueAtTime(880 * 0.5, now + 0.15);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  } catch (e) {
    // Audio context may be blocked by browser policy until user interacts
  }
}

export default function KitchenDisplaySystem({ initialSlug, initialPin, embedded = false }: KitchenDisplayProps) {
  // Authentication State
  const [slug, setSlug] = useState<string>(initialSlug || "");
  const [pin, setPin] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // KDS Orders & Runtime State
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

  // Real-time Clock State (Ticks every second)
  const [currentTime, setCurrentTime] = useState<string>("");

  // Sound Chime State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const previousOrdersCountRef = useRef<number>(0);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Filter State
  const [kdsFilter, setKdsFilter] = useState<"all" | "received" | "in_kitchen" | "ready" | "delivered">("all");

  // Keep digital clock ticking live
  useEffect(() => {
    const updateClock = () => {
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
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check saved session in sessionStorage or URL (query param or path segment)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const querySlug = urlParams.get("slug");

    // Also extract slug from pathname if present (e.g. /kitchen/tiwana-restraunt)
    let pathSlug = "";
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const kitchenIdx = pathParts.indexOf("kitchen");
    if (kitchenIdx !== -1 && pathParts.length > kitchenIdx + 1) {
      pathSlug = pathParts[kitchenIdx + 1];
    }

    const activeSlug = querySlug || pathSlug || initialSlug || sessionStorage.getItem("kds_slug") || slug;

    if (activeSlug) {
      setSlug(activeSlug);
    }

    const sessionKey = activeSlug ? `kds_pin_${activeSlug}` : "kds_pin_default";
    const savedPin = initialPin || sessionStorage.getItem(sessionKey);

    if (savedPin && activeSlug) {
      setPin(savedPin);
      verifyPinInternal(activeSlug, savedPin, true);
    }
  }, [initialSlug, initialPin]);

  const verifyPinInternal = async (targetSlug: string, targetPin: string, isSilent = false) => {
    if (!targetSlug.trim() || !targetPin.trim()) {
      if (!isSilent) setPinError("Please enter restaurant slug and PIN");
      return;
    }

    if (!isSilent) setVerifyingPin(true);
    setPinError(null);

    try {
      const res = await verifyKitchenPin(targetPin.trim(), targetSlug.trim(), "kitchen");
      if (res.success) {
        setIsAuthenticated(true);
        setRestaurantName(res.business_name || targetSlug);
        setSlug(res.slug || targetSlug);
        sessionStorage.setItem(`kds_pin_${res.slug || targetSlug}`, targetPin.trim());
        sessionStorage.setItem("kds_slug", res.slug || targetSlug);
        loadKitchenOrders(res.slug || targetSlug, targetPin.trim());
      }
    } catch (err: any) {
      setPinError(err?.message || "Invalid Kitchen PIN. Please check dashboard settings.");
      setIsAuthenticated(false);
    } finally {
      if (!isSilent) setVerifyingPin(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPinInternal(slug, pin);
  };

  // Virtual Keypad Button Press
  const handleKeypadPress = (val: string) => {
    if (pin.length < 6) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === 4 && slug.trim()) {
        verifyPinInternal(slug, nextPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPin("");
    setPinError(null);
  };

  const handleLogoutKDS = () => {
    setIsAuthenticated(false);
    setPin("");
    sessionStorage.removeItem(`kds_pin_${slug}`);
  };

  // Load live orders from backend
  const loadKitchenOrders = useCallback(
    async (targetSlug: string, targetPin: string, isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      try {
        const data = await getKitchenOrders(targetSlug, targetPin);
        if (data && Array.isArray(data)) {
          // Play sound alert if new order arrives
          if (
            soundEnabled &&
            previousOrdersCountRef.current > 0 &&
            data.length > previousOrdersCountRef.current
          ) {
            playKitchenOrderChime();
          }
          previousOrdersCountRef.current = data.length;
          setOrders(data);
        }
      } catch (err: any) {
        console.error("Failed to load kitchen orders", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [soundEnabled]
  );

  // Polling every 6 seconds for live orders
  useEffect(() => {
    if (!isAuthenticated || !slug || !pin) return;
    const interval = setInterval(() => {
      loadKitchenOrders(slug, pin, true);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAuthenticated, slug, pin, loadKitchenOrders]);

  // Handle Order Status Bump Action
  const handleBumpStatus = async (
    order: RestaurantOrder,
    targetStatus:
      | "received"
      | "in_kitchen"
      | "preparing"
      | "ready"
      | "out_for_delivery"
      | "reached"
      | "delivered"
      | "picked_up"
      | "completed"
      | "cancelled"
  ) => {
    setUpdatingOrderId(order.id);
    try {
      const updated = await updateKitchenOrderStatus(order.id, slug, pin, targetStatus);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (soundEnabled && (targetStatus === "ready" || targetStatus === "delivered" || targetStatus === "picked_up")) {
        playKitchenOrderChime();
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to bump ticket status", "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // User Prompt Confirmation for manual touch bumps
  const promptBumpStatus = (
    order: RestaurantOrder,
    targetStatus:
      | "received"
      | "in_kitchen"
      | "preparing"
      | "ready"
      | "out_for_delivery"
      | "reached"
      | "delivered"
      | "picked_up"
      | "completed"
      | "cancelled"
  ) => {
    let title = `Update Order #${order.order_number}?`;
    let message = `Are you sure you want to change ticket status to ${targetStatus.replace("_", " ").toUpperCase()}?`;
    let confirmLabel = `Bump to ${targetStatus.replace("_", " ").toUpperCase()}`;
    let variant: "danger" | "warning" | "success" | "primary" | "emerald" | "amber" | "cyan" = "primary";

    if (targetStatus === "in_kitchen") {
      title = `Start Cooking Order #${order.order_number}?`;
      message = "This will start the 20-minute cook line timer and notify the customer.";
      confirmLabel = "Start Cooking (20m)";
      variant = "amber";
    } else if (targetStatus === "ready") {
      title = `Mark Order #${order.order_number} Ready?`;
      message = `Food preparation is complete.${order.order_type === "delivery" ? " Order will be dispatched to the Rider Delivery app." : " Customer will receive WhatsApp pickup alert."}`;
      confirmLabel = "Mark as Ready";
      variant = "emerald";
    } else if (targetStatus === "picked_up") {
      title = `Confirm Pickup for #${order.order_number}?`;
      message = "Guest has received their food. This order will be marked completed.";
      confirmLabel = "Confirm Picked Up";
      variant = "cyan";
    } else if (targetStatus === "delivered") {
      title = `Confirm Delivered #${order.order_number}?`;
      message = "Confirm that the order has been delivered to the customer / table.";
      confirmLabel = "Confirm Delivered";
      variant = "emerald";
    } else if (targetStatus === "received") {
      title = `Revert Order #${order.order_number} to New?`;
      message = "Reset cooking status back to received / new.";
      confirmLabel = "Revert to New";
      variant = "warning";
    }

    setConfirmModal({
      isOpen: true,
      title,
      message,
      details: (
        <div className="space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Customer: <strong className="text-white">{order.customer_name}</strong></span>
            <span className="font-bold text-amber-400">Rs. {Number(order.total_amount).toFixed(0)}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Type: <span className="uppercase text-slate-200">{order.order_type}{order.table_number ? ` • Table #${order.table_number}` : ""}</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            Dishes: {order.items?.map((it: any) => `${it.quantity}x ${it.name}`).join(", ") || "Standard items"}
          </div>
        </div>
      ),
      confirmLabel,
      variant,
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        await handleBumpStatus(order, targetStatus);
        setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
      },
    });
  };

  const promptLogoutKDS = () => {
    setConfirmModal({
      isOpen: true,
      title: "Lock Kitchen Display Screen?",
      message: "Are you sure you want to lock the KDS screen? Staff will need to re-enter the Kitchen PIN to unlock.",
      confirmLabel: "Lock Screen",
      variant: "warning",
      onConfirm: () => {
        setIsAuthenticated(false);
        setPin("");
        sessionStorage.removeItem(`kds_pin_${slug}`);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // 20-minute cooking countdown timer calculator
  const getCookingCountdown = (cookingStartedAt?: string | null, fallbackDateStr?: string) => {
    const startStr = cookingStartedAt || fallbackDateStr;
    if (!startStr) return { secondsLeft: 1200, percent: 0, text: "20:00", isDone: false };
    const startMs = new Date(startStr).getTime();
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const remainingSec = Math.max(0, 1200 - elapsedSec);
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    const percent = Math.min(100, Math.floor((elapsedSec / 1200) * 100));
    return {
      secondsLeft: remainingSec,
      percent,
      text: `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
      isDone: remainingSec === 0,
    };
  };

  // Auto-advance cooking tickets to 'ready' once 20 minutes elapse
  useEffect(() => {
    if (!isAuthenticated || !slug || !pin) return;
    orders.forEach((order) => {
      const isInCooking = order.status === "in_kitchen" || order.status === "preparing";
      if (isInCooking) {
        const timer = getCookingCountdown(order.cooking_started_at, order.created_at);
        if (timer.isDone && updatingOrderId !== order.id) {
          handleBumpStatus(order, "ready");
        }
      }
    });
  }, [currentTime, orders, isAuthenticated, slug, pin, updatingOrderId]);

  // Filtered Orders for KDS Grid
  const visibleOrders = useMemo(() => {
    return orders.filter((o) => {
      if (kdsFilter === "all") {
        return (
          o.status === "received" ||
          o.status === "in_kitchen" ||
          o.status === "preparing" ||
          o.status === "ready"
        );
      }
      if (kdsFilter === "in_kitchen") {
        return o.status === "in_kitchen" || o.status === "preparing";
      }
      if (kdsFilter === "delivered") {
        return o.status === "delivered" || o.status === "picked_up" || o.status === "completed";
      }
      return o.status === kdsFilter;
    });
  }, [orders, kdsFilter]);

  // Elapsed Time Calculator
  const getElapsedMinutes = (createdAtStr?: string) => {
    if (!createdAtStr) return 0;
    const diffMs = Date.now() - new Date(createdAtStr).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const formatElapsedTime = (createdAtStr?: string) => {
    if (!createdAtStr) return "00:00";
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(createdAtStr).getTime()) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ==================== SCREEN 1: PIN AUTHENTICATION KEYPAD ====================
  if (!isAuthenticated) {
    return (
      <div className={`${embedded ? "flex-1 flex flex-col items-center justify-center p-4 bg-[#080B11]" : "min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center p-4 selection:bg-amber-500"}`}>
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0F1420] border border-slate-800 shadow-2xl space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <ChefHat className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-sans">
              Kitchen Display (KDS)
            </h1>
            <p className="text-xs text-slate-400">
              Enter 4-digit Kitchen PIN configured in restaurant dashboard
            </p>
          </div>

          {/* PIN Error Message */}
          {pinError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{pinError}</span>
            </div>
          )}

          {/* Slug Input (if not supplied in route) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Restaurant Slug / Identifier
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. bistro, my-restaurant"
              className="w-full px-4 py-2.5 rounded-xl bg-[#171E2E] border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {/* PIN Display Indicators */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Kitchen Security PIN
            </label>
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-mono font-bold transition-all ${
                    pin.length > idx
                      ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-md shadow-amber-500/20"
                      : "border-slate-700 bg-[#171E2E] text-slate-500"
                  }`}
                >
                  {pin.length > idx ? "•" : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Touch-Friendly Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num.toString())}
                className="py-3.5 rounded-2xl bg-[#171E2E] hover:bg-[#20293D] active:scale-95 text-lg font-bold font-mono text-white border border-slate-700/60 shadow-sm transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-xs font-bold font-mono text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="py-3.5 rounded-2xl bg-[#171E2E] hover:bg-[#20293D] active:scale-95 text-lg font-bold font-mono text-white border border-slate-700/60 transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="py-3.5 rounded-2xl bg-[#171E2E] hover:bg-[#20293D] active:scale-95 text-xs font-bold font-mono text-slate-300 border border-slate-700/60 transition-all cursor-pointer"
            >
              ⌫ DEL
            </button>
          </div>

          {/* Submit Action */}
          <button
            type="button"
            disabled={verifyingPin || pin.length < 4 || !slug.trim()}
            onClick={handlePinSubmit}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
          >
            {verifyingPin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>Unlock Kitchen Screen</span>
          </button>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 2: FULLSCREEN KITCHEN DISPLAY SYSTEM ====================
  const receivedCount = orders.filter((o) => o.status === "received" || o.status === "confirmed").length;
  const inKitchenCount = orders.filter((o) => o.status === "in_kitchen" || o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered" || o.status === "picked_up" || o.status === "completed").length;

  return (
    <div className={`${embedded ? "flex-1 flex flex-col bg-[#070A10] text-slate-100 select-none overflow-y-auto" : "min-h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans select-none selection:bg-amber-500"}`}>
      {/* ==================== HIGH-CONTRAST TOP STATUS BAR ==================== */}
      <header className="sticky top-0 z-40 bg-[#0E131F] border-b-2 border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Left: Brand & Restaurant */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/30">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black uppercase tracking-tight text-white font-mono">
                {restaurantName || slug}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black">
                KDS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Kitchen Display &bull; Large Screen Station
            </p>
          </div>
        </div>

        {/* Center: Live Digital Clock & Active Counter */}
        <div className="flex items-center gap-4">
          {/* Live Digital Clock */}
          <div className="px-4 py-1.5 rounded-xl bg-[#161D2D] border border-slate-700/80 font-mono text-base font-bold text-amber-400 tracking-wider flex items-center gap-2 shadow-inner">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{currentTime}</span>
          </div>

          {/* Active Orders Count Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>{visibleOrders.length} TICKETS ACTIVE</span>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
            title={soundEnabled ? "Audio Bell Enabled" : "Audio Bell Muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? "Bell ON" : "Muted"}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#161D2D] hover:bg-[#20293D] border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle Fullscreen for Large TV"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadKitchenOrders(slug, pin)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-[#161D2D] hover:bg-[#20293D] border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh orders now"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
          </button>

          {/* Lock Screen */}
          <button
            type="button"
            onClick={promptLogoutKDS}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Lock Kitchen Screen"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==================== TICKETS FILTER BAR ==================== */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#0C101A] border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: "all", label: `ALL ACTIVE TICKETS (${visibleOrders.length})` },
            { id: "received", label: `🔥 NEW ORDERS (${receivedCount})` },
            { id: "in_kitchen", label: `🍳 COOKING (${inKitchenCount})` },
            { id: "ready", label: `✅ PACKED & READY (${readyCount})` },
            { id: "delivered", label: `📦 COMPLETED (${deliveredCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setKdsFilter(tab.id as any)}
              className={`px-4 py-1.5 rounded-xl font-bold font-mono tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                kdsFilter === tab.id
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black"
                  : "bg-[#141A28] text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-slate-400 hidden md:block">
          Auto-polling orders live every 6s &bull; Currency: Rs.
        </div>
      </div>

      {/* ==================== KITCHEN ORDERS GRID ==================== */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-400">
            <RefreshCw className="w-10 h-10 animate-spin text-amber-500" />
            <p className="text-sm font-bold uppercase tracking-wider font-mono">
              Loading Kitchen Ticket Pipeline...
            </p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white font-mono">
              ALL TICKETS CLEARED
            </h2>
            <p className="text-xs text-slate-400 max-w-md">
              The kitchen pipeline is completely clear. Incoming orders from WhatsApp or online customers will immediately sound a chime and populate this screen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {visibleOrders.map((order) => {
              const elapsedMins = getElapsedMinutes(order.created_at);
              const elapsedStr = formatElapsedTime(order.created_at);

              // Kitchen Urgency Color Scheme:
              // < 5 mins = Green (Normal)
              // 5 - 10 mins = Amber (Warning)
              // > 10 mins = Red Pulsing (Rush Overdue)
              const isUrgent = elapsedMins >= 10;
              const isWarning = elapsedMins >= 5 && elapsedMins < 10;

              const isReceived = order.status === "received" || order.status === "confirmed";
              const isInKitchen = order.status === "in_kitchen" || order.status === "preparing";
              const isReady = order.status === "ready";
              const isDelivered = order.status === "delivered" || order.status === "picked_up" || order.status === "completed";
              const isUpdating = updatingOrderId === order.id;
              const cookingTimer = getCookingCountdown(order.cooking_started_at, order.created_at);

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${
                    isUrgent
                      ? "bg-[#181116] border-rose-600 shadow-rose-950/40 ring-2 ring-rose-500/30 animate-pulse"
                      : isWarning
                      ? "bg-[#181510] border-amber-500/80 shadow-amber-950/40"
                      : isReceived
                      ? "bg-[#121724] border-amber-500/60"
                      : isInKitchen
                      ? "bg-[#121724] border-blue-500/60"
                      : "bg-[#101918] border-emerald-500/60"
                  }`}
                >
                  {/* Card Header: Big Order # & Elapsed Timer */}
                  <div className="p-4 border-b-2 border-slate-800/80 bg-[#151C2C] space-y-2">
                    <div className="flex items-center justify-between">
                      {/* Big Order Number */}
                      <span className="text-xl font-black font-mono tracking-tight text-white">
                        {order.order_number || `#${order.id.slice(0, 6).toUpperCase()}`}
                      </span>

                      {/* Elapsed Time Badge */}
                      <div
                        className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 tracking-wider ${
                          isUrgent
                            ? "bg-rose-600 text-white animate-bounce shadow-md"
                            : isWarning
                            ? "bg-amber-500 text-black shadow-md font-bold"
                            : "bg-emerald-600/30 text-emerald-400 border border-emerald-500/40"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsedStr}</span>
                      </div>
                    </div>

                    {/* Order Type & Customer Name */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider ${
                          order.order_type === "delivery"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            : order.order_type === "pickup"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            : "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                        }`}
                      >
                        {order.order_type === "delivery" && <Truck className="w-3 h-3" />}
                        {order.order_type === "pickup" && <ShoppingBag className="w-3 h-3" />}
                        {order.order_type === "dine_in" && <UtensilsCrossed className="w-3 h-3" />}
                        <span>
                          {order.order_type || "Delivery"}
                          {order.table_number && ` • Table #${order.table_number}`}
                        </span>
                      </span>

                      <span className="font-bold text-slate-300 truncate max-w-[130px]">
                        {order.customer_name || "Guest"}
                      </span>
                    </div>

                    {/* Delivery Address if present */}
                    {order.delivery_address && (
                      <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                        📍 {order.delivery_address}
                      </p>
                    )}
                  </div>

                  {/* Card Body: Food Items Checklist */}
                  <div className="p-4 flex-1 space-y-3 font-mono">
                    <div className="space-y-2.5 divide-y divide-slate-800">
                      {(order.items || []).map((it, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 space-y-1">
                          {/* Qty & Item Name */}
                          <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-black font-black text-sm">
                              {it.quantity}x
                            </span>
                            <div className="flex-1">
                              <span className="text-sm font-bold text-white uppercase tracking-tight block">
                                {it.name}
                              </span>

                              {/* Variant / Size chip */}
                              {it.variant && (
                                <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[11px] font-bold bg-[#20293D] text-amber-300 border border-amber-500/30">
                                  Size: {it.variant}
                                </span>
                              )}

                              {/* Addons chips */}
                              {it.addons && it.addons.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {it.addons.map((ad, aIdx) => (
                                    <span
                                      key={aIdx}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    >
                                      + {ad}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Item Customization Notes */}
                              {it.notes && (
                                <div className="mt-1 p-1 rounded bg-rose-500/10 border border-rose-500/30 text-[10px] font-bold text-rose-300">
                                  ⚠️ {it.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Kitchen Special Instructions */}
                    {(order.special_instructions || (order as any).notes) && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-[11px] font-bold text-amber-300">
                        ⚡ SPECIAL: "{order.special_instructions || (order as any).notes}"
                      </div>
                    )}
                    {/* Cooking Countdown Timer (20 minutes) */}
                    {isInKitchen && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span>COOKING TIMER (20m):</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-black text-xs">
                            {cookingTimer.text} left
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
                            style={{ width: `${cookingTimer.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Ready for Rider Notice */}
                    {isReady && order.order_type === "delivery" && (
                      <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-cyan-300 text-xs font-bold">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-cyan-400 animate-pulse" />
                          <span>Ready for Delivery</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 uppercase font-mono">
                          On Rider Screen
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Big Touch Bump Buttons */}
                  <div className="p-3 border-t-2 border-slate-800/80 bg-[#111724] space-y-2">
                    {/* Primary Bump Action */}
                    {isReceived && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => promptBumpStatus(order, "in_kitchen")}
                        className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Flame className="w-5 h-5" />
                        )}
                        <span>START COOKING (20m)</span>
                      </button>
                    )}

                    {isInKitchen && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => promptBumpStatus(order, "ready")}
                        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                        <span>BUMP / READY</span>
                      </button>
                    )}

                    {isReady && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => promptBumpStatus(order, "picked_up")}
                            className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="w-4 h-4" />
                            )}
                            <span>PICKED UP</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => promptBumpStatus(order, "delivered")}
                            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>DELIVERED</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isDelivered && (
                      <div className="py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Completed / {order.status.replace("_", " ").toUpperCase()}</span>
                      </div>
                    )}

                    {/* Secondary Undo Stage Button */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
                      <span className="font-bold text-amber-400">
                        Total: Rs. {Number(order.total_amount || 0).toFixed(0)}
                      </span>

                      {isInKitchen && (
                        <button
                          type="button"
                          onClick={() => promptBumpStatus(order, "received")}
                          className="hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Undo to New</span>
                        </button>
                      )}

                      {isReady && (
                        <button
                          type="button"
                          onClick={() => promptBumpStatus(order, "in_kitchen")}
                          className="hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Back to Cooking</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
