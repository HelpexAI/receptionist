"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  Volume2,
  CalendarCheck,
  Stethoscope,
  UtensilsCrossed,
  Shield,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Lock,
  Phone,
  Mail,
  Building2,
  X,
  Play,
  Check,
  Zap,
  Globe,
  Sliders,
  ExternalLink,
  MessageSquare,
  Flame,
  Award,
  Users,
  Star,
  ChevronDown,
} from "lucide-react";
import { submitDemoLead, API_BASE } from "@/lib/api";

export default function HomePage() {
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  // Demo Booking Form State
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadBusinessName, setLeadBusinessName] = useState("");
  const [leadBusinessType, setLeadBusinessType] = useState("clinic");
  const [leadNotes, setLeadNotes] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => {
        if (res.ok) {
          setApiOnline(true);
        } else {
          fetch(`${API_BASE}/health`)
            .then((r) => setApiOnline(r.ok))
            .catch(() => setApiOnline(false));
        }
      })
      .catch(() => {
        fetch(`${API_BASE}/health`)
          .then((res) => setApiOnline(res.ok))
          .catch(() => setApiOnline(false));
      });
  }, []);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);
    setLeadError(null);

    try {
      await submitDemoLead({
        name: leadName.trim(),
        email: leadEmail.trim(),
        phone: leadPhone.trim(),
        business_name: leadBusinessName.trim(),
        business_type: leadBusinessType,
        notes: leadNotes.trim() || undefined,
      });
      setLeadSubmitted(true);
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
      setLeadBusinessName("");
      setLeadNotes("");
    } catch (err: any) {
      setLeadError(err.message || "Failed to submit demo request. Please try again.");
    } finally {
      setSubmittingLead(false);
    }
  };

  const faqs = [
    {
      q: "How does the bilingual Roman Urdu & English reception work?",
      a: "Our neural language model automatically identifies whether the patient or guest speaks Roman Urdu (e.g., 'Mujhe appointment chahiye') or standard English. It maintains natural conversational flow, clarifying doctor schedules, fee structures, and dining options with zero robotic lag.",
    },
    {
      q: "Can I connect my clinic or restaurant WhatsApp number?",
      a: "Yes! Connecting takes under 60 seconds: simply scan the WhatsApp Web QR code in your dashboard. Incoming messages are immediately answered by the AI receptionist, while confirmed bookings sync straight to your calendar.",
    },
    {
      q: "How does the system prevent double-booking conflicts?",
      a: "Our backend utilizes atomic database row locking (SELECT ... FOR UPDATE). When a slot or dining table is being reserved, it is locked in a microsecond transaction, eliminating double-booking disputes 100%.",
    },
    {
      q: "What are the limits on the Free Plan?",
      a: "The Free plan includes 200 confirmed appointments or kitchen orders per month. Furthermore, during our current Beta phase, all early access businesses receive 1 Full Year of the Unlimited Paid Pro Plan completely free!",
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ==================== 1. HERO SECTION ==================== */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Top Beta Badge */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-[#D97757]/15 border border-[#D97757]/30 text-[#D97757] dark:text-[#E58A6B] text-xs font-bold shadow-md shadow-[#D97757]/10">
            <Sparkles className="w-4 h-4 text-[#D97757]" />
            <span>AI Business Management • Unified POS, Station Screens &amp; 24/7 Autonomous AI</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 text-xs text-[#5E5D59] dark:text-[#B0AEA5]">
            <span className="w-2 h-2 rounded-full bg-[#D97757] animate-ping" />
            <span>Point of Sale • Kitchen Display • Rider Fleet • WhatsApp AI</span>
            <span>•</span>
            <span className="text-[#D97757] font-mono font-bold">
              {apiOnline ? "System Engine Online" : "Connecting..."}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Autonomous Business Operations &amp; Management with{" "}
            <span className="text-[#D97757]">
              AI Business Management
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-[#5E5D59] dark:text-[#B0AEA5] max-w-3xl mx-auto leading-relaxed">
            All-in-one operating platform for restaurants, cafes, and healthcare practices. Seamlessly punch orders on touch POS, coordinate kitchen cooking timers &amp; rider delivery dispatch, while bilingual AI answers customer calls and WhatsApp messages 24/7.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-[#D97757] hover:bg-[#C6613F] transition-all shadow-lg shadow-[#D97757]/25 flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Business Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/pricing"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-slate-800 bg-[#F0EEE6] hover:bg-[#E8E6DC] border border-[#E8E6DC] dark:text-slate-200 dark:bg-[#30302E] dark:hover:bg-[#3D3D3A] dark:border-[#3D3D3A] hover:border-[#D97757]/40 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Explore Plans (200 Free Orders)</span>
            </Link>

            <a
              href="#solutions"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm text-[#5E5D59] hover:text-[#141413] dark:text-[#B0AEA5] dark:hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View Stations &amp; Features &darr;</span>
            </a>
          </div>

          {/* Trust stats pill bar (0 Conflict removed) */}
          <div className="pt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 shadow-sm">
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono block">Real-Time</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">POS · Kitchen KDS · Rider Sync</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-teal-500/20 shadow-sm">
              <span className="text-2xl font-extrabold text-teal-700 dark:text-teal-400 font-mono block">&lt;1.2s</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Bilingual Voice &amp; Chat AI</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 shadow-sm">
              <span className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-400 font-mono block">24/7/365</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Continuous Order Automation</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 2. TRUSTED LOGOS / BADGES BAR ==================== */}
      <section className="py-8 border-y border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">
            Trusted by medical practices, diagnostic centers, &amp; dining establishments
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-75 dark:opacity-60 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <span>Al-Razi Healthcare</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>CarePlus Medical</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <UtensilsCrossed className="w-5 h-5 text-amber-600" />
              <span>Artisan Bistro</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Flame className="w-5 h-5 text-rose-600" />
              <span>Downtown Grill</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Award className="w-5 h-5 text-cyan-600" />
              <span>Apex Dental Suite</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 3. HOW IT WORKS (3 SIMPLE STEPS) ==================== */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Simple 3-Step Setup
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Operational in Under 60 Seconds
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Zero complex software setups or telecom approvals needed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold font-mono">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Configure Stations &amp; WhatsApp
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Set up your menu catalog or doctor roster, generate 4-digit station PINs for POS &amp; Kitchen, and scan WhatsApp QR in under 60 seconds.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold font-mono">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Coordinate Live Operations
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Punch orders on touch POS, track 20-min automated cooking timers on Kitchen KDS, and dispatch riders with real-time delivery status updates.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold font-mono">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Autonomous AI Reception 24/7
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Customers talk or text naturally in Roman Urdu &amp; English. The AI takes food orders, quotes delivery charges, and books appointments seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== 4. SOLUTIONS COMPARISON ==================== */}
      <section id="solutions" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Tailored Industry Solutions
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Built Specifically for Clinics &amp; Restaurants
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Unified operations, station screens, and autonomous AI intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Clinic Card */}
          <div className="glass-panel p-8 rounded-3xl border border-emerald-500/25 space-y-6 hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Medical &amp; Healthcare Clinics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Automate patient triage, physician selection, and consultation schedules around the clock.
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Physician roster with specialty-based symptom matching and fee lookup.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Bulk calendar slot generator with customizable lunch break windows.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>One-click patient cancellation and real-time slot release workflow.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>WhatsApp and web voice widget with bilingual Roman Urdu &amp; English synthesis.</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => {
                setLeadBusinessType("clinic");
                setIsDemoModalOpen(true);
              }}
              className="w-full py-3 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
            >
              Schedule Clinic Demo &rarr;
            </button>
          </div>

          {/* Restaurant Card */}
          <div className="glass-panel p-8 rounded-3xl border border-amber-500/25 space-y-6 hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Restaurants, Bistros &amp; Cloud Kitchens
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Full-suite operations: Touch POS terminal, live Kitchen Display (KDS), Rider Fleet dispatch, and 24/7 WhatsApp AI receptionist.
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Touch POS screen with instant item selection, Dine-in table #, and 80mm thermal receipts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Kitchen Display System (KDS) with 20-minute automated cooking timers and station PINs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Mobile-first Rider Delivery Fleet portal with real-time reached &amp; delivered updates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>24/7 bilingual WhatsApp receptionist with menu recommendations and custom delivery fees.</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => {
                setLeadBusinessType("restaurant");
                setIsDemoModalOpen(true);
              }}
              className="w-full py-3 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
            >
              Schedule Restaurant Demo &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* ==================== 5. PRICING SECTION (2 CARDS EMBEDDED) ==================== */}
      <section id="pricing" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Simple &amp; Predictable Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Choose the Perfect Plan for Your Business
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Start completely free or unlock unlimited volume. Zero setup fees or surprise charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Card 1: Free Plan */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Free Starter</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    For individual doctors &amp; boutique cafes
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Free Forever
                </span>
              </div>

              <div className="my-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                    Rs. 0
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>200 Bookings / Orders Included</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97757] shrink-0 mt-0.5" />
                  <span><strong>200 confirmed orders/bookings</strong> per month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97757] shrink-0 mt-0.5" />
                  <span>Bilingual Roman Urdu &amp; English AI voice synthesis</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97757] shrink-0 mt-0.5" />
                  <span>WhatsApp QR gateway integration &amp; Web widget</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97757] shrink-0 mt-0.5" />
                  <span>Atomic database slot locking with zero conflicts</span>
                </li>
              </ul>
            </div>

            <Link
              href="/pricing"
              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-[#F0EEE6] hover:bg-[#E8E6DC] dark:bg-[#30302E] dark:hover:bg-[#3D3D3A] border border-[#E8E6DC] dark:border-[#3D3D3A] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center"
            >
              <span>Get Started Free (200 Bookings)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Pro Unlimited Plan */}
          <div className="glass-panel p-8 rounded-3xl border-2 border-[#D97757] flex flex-col justify-between shadow-xl relative">
            <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#D97757] text-white shadow-md shadow-[#D97757]/30">
              Beta Special: 1 Year Free
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Professional Pro</span>
                    <span className="w-2 h-2 rounded-full bg-[#D97757] animate-ping" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    For multi-physician clinics &amp; busy restaurants
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#D97757] flex items-center justify-center text-white shadow-md shadow-[#D97757]/30">
                  <Zap className="w-5 h-5" />
                </div>
              </div>

              <div className="my-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#D97757] font-mono">
                    Free (Beta)
                  </span>
                  <span className="text-xs text-slate-400 line-through">Rs. 5,000/mo</span>
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D97757]/15 text-[#D97757] dark:text-[#E58A6B] border border-[#D97757]/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1 Year Free Unlimited Early Access</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Unlimited bookings &amp; orders</strong> (no volume caps)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Sub-1.2s voice synthesis with audio interruption (barge-in)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Bulk slot generator, break windows &amp; kitchen notifications</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>24/7 Priority support &amp; dedicated onboarding specialist</span>
                </li>
              </ul>
            </div>

            <Link
              href="/pricing"
              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upgrade to Pro (Rs. 5,000 / mo)</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== 6. FAQ ACCORDION ==================== */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== 7. BOTTOM CONVERSION BANNER ==================== */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Upgrade to AI Business Management?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed max-w-lg mx-auto">
              Empower your staff, coordinate point of sale &amp; live kitchen operations, delight guests, and never miss an order again.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/login"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-all shadow-lg cursor-pointer"
              >
                Sign In to Portal
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-700/60 hover:bg-emerald-700/80 text-white font-bold text-xs border border-white/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>View Plans &amp; Pricing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 8. FOOTER ==================== */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">AI Business Management Platform</span>
              <span>© {new Date().getFullYear()} AI Business Management Inc. All rights reserved.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
              Portal Sign In
            </Link>
            <Link href="/admin" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
              Admin Console
            </Link>
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Request Enterprise Demo
            </button>
          </div>
        </div>
      </footer>

      {/* ==================== DEMO / CONTACT MODAL ==================== */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl relative glow-emerald">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Book a Live Platform Demo</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">See our AI receptionist live on your phone or website</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {leadSubmitted ? (
              <div className="text-center py-8 space-y-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Demo Request Received!</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Thank you! Our solutions specialist will reach out to schedule your personalized live demo session.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Close &amp; Explore Website
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                {leadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 dark:text-rose-300">
                    {leadError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. Dr. Usman Tariq"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Work Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="usman@careclinic.com"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business / Practice Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadBusinessName}
                      onChange={(e) => setLeadBusinessName(e.target.value)}
                      placeholder="e.g. City Care Medical"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Industry Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={leadBusinessType}
                    onChange={(e) => setLeadBusinessType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  >
                    <option value="clinic">Medical Clinic / Physician Practice</option>
                    <option value="dental">Dental &amp; Specialized Care</option>
                    <option value="restaurant">Restaurant / Dining Cafe</option>
                    <option value="hospitality">Hospitality &amp; Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    What is your primary goal or question? <span className="text-slate-400 text-[10px]">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                    placeholder="e.g. Need WhatsApp or Web widget for booking 5 doctors..."
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingLead}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submittingLead ? (
                      <span>Sending Demo Request...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm &amp; Schedule Demo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
