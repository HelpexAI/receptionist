"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Stethoscope,
  Calendar,
  Users,
  Clock,
  Plus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Phone,
  Search,
  Code2,
  Copy,
  Check,
  CalendarCheck,
  Trash2,
  Ban,
  Power,
  Pencil,
  X,
  ExternalLink,
  Eye,
  KeyRound,
  Lock,
  Menu,
  Shield,
  MessageSquare,
  CalendarDays,
  ChevronRight,
  Bot,
  Layers,
  FileText,
  Loader2,
} from "lucide-react";
import WhatsAppConnectCard from "@/src/components/WhatsAppConnectCard";
import ConfirmationModal from "@/src/components/ConfirmationModal";
import ThemeToggle from "../components/ThemeToggle";
import {
  getAuth,
  clearAuth,
  getClinicDoctors,
  createClinicDoctor,
  updateClinicDoctor,
  toggleDoctorAvailabilityToday,
  getClinicSlots,
  createClinicSlots,
  deleteClinicSlot,
  toggleSlotDisabled,
  manualBookClinicSlot,
  manualUnbookClinicSlot,
  getClinicAppointments,
  getProfile,
  changePassword,
  Doctor,
  DoctorSlot,
  ClinicAppointment,
} from "@/lib/api";

const DAYS_OF_WEEK = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export default function ClinicDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"appointments" | "doctors" | "slots" | "whatsapp" | "widget" | "security">("appointments");
  const [tenantName, setTenantName] = useState<string>("MediSync Clinic");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Clinic Profile & Widget State
  const [clinicProfile, setClinicProfile] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Change Password State
  const [changePasswordCurrent, setChangePasswordCurrent] = useState("");
  const [changePasswordNew, setChangePasswordNew] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Data State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [statusToast, setStatusToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [releasingSlotId, setReleasingSlotId] = useState<string | null>(null);
  const [togglingSlotId, setTogglingSlotId] = useState<string | null>(null);
  const [togglingDoctorId, setTogglingDoctorId] = useState<string | null>(null);

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

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setStatusToast({ msg, type });
    setTimeout(() => setStatusToast(null), 3500);
  };

  // New Doctor Form State
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docSpecialty, setDocSpecialty] = useState("");
  const [docSymptoms, setDocSymptoms] = useState("");
  const [docFee, setDocFee] = useState<number>(50);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [doctorSuccessMsg, setDoctorSuccessMsg] = useState<string | null>(null);

  // Single Slot Creator Form State
  const [isSingleSlotModalOpen, setIsSingleSlotModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slotStartTime, setSlotStartTime] = useState("09:00");
  const [slotEndTime, setSlotEndTime] = useState("09:30");
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [slotSuccessMsg, setSlotSuccessMsg] = useState<string | null>(null);

  // Bulk Slot Creator Form State
  const [isBulkSlotModalOpen, setIsBulkSlotModalOpen] = useState(false);
  const [bulkDoctorId, setBulkDoctorId] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bulkEndDate, setBulkEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 6);
    return nextWeek.toISOString().split("T")[0];
  });
  const [bulkStartTime, setBulkStartTime] = useState("09:00");
  const [bulkEndTime, setBulkEndTime] = useState("17:00");
  const [hasBreak, setHasBreak] = useState(true);
  const [breakStartTime, setBreakStartTime] = useState("13:00");
  const [breakEndTime, setBreakEndTime] = useState("14:00");
  const [slotInterval, setSlotInterval] = useState<number>(30);
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [creatingBulkSlots, setCreatingBulkSlots] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  // Filters
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentDoctorFilter, setAppointmentDoctorFilter] = useState<string>("all");
  const [appointmentViewMode, setAppointmentViewMode] = useState<"cards" | "table">("cards");

  const [slotDoctorFilter, setSlotDoctorFilter] = useState<string>("all");
  const [slotDateFilter, setSlotDateFilter] = useState<string>("");
  const [slotStatusFilter, setSlotStatusFilter] = useState<"all" | "available" | "booked" | "disabled">("all");

  // Doctor Details / Edit Modal State
  const [selectedDoctorModal, setSelectedDoctorModal] = useState<Doctor | null>(null);
  const [isEditingDoctor, setIsEditingDoctor] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editSymptoms, setEditSymptoms] = useState("");
  const [editFee, setEditFee] = useState<number>(50);
  const [updatingDoctor, setUpdatingDoctor] = useState(false);

  // Slot Manual Booking Modal State
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<DoctorSlot | null>(null);
  const [manualPatientName, setManualPatientName] = useState("");
  const [manualPatientPhone, setManualPatientPhone] = useState("");
  const [manualSymptoms, setManualSymptoms] = useState("");
  const [bookingSlotLoading, setBookingSlotLoading] = useState(false);

  // Appointment Details Modal
  const [selectedAppointmentModal, setSelectedAppointmentModal] = useState<ClinicAppointment | null>(null);

  // Auth Guard
  useEffect(() => {
    const auth = getAuth();
    if (!auth.token) {
      router.push("/login");
      return;
    }
    if (auth.business_type && auth.business_type !== "clinic") {
      router.push("/restaurant");
      return;
    }
    if (auth.name) {
      setTenantName(auth.name);
    }
  }, [router]);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [docsData, slotsData, apptsData, profileData] = await Promise.all([
        getClinicDoctors().catch(() => []),
        getClinicSlots().catch(() => []),
        getClinicAppointments().catch(() => []),
        getProfile().catch(() => null),
      ]);

      setDoctors(docsData || []);
      setSlots(slotsData || []);
      setAppointments(apptsData || []);
      if (profileData) {
        setClinicProfile(profileData);
        if (profileData.business_name || profileData.name) {
          setTenantName(profileData.business_name || profileData.name);
        }
      }
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      setError(err?.message || "Failed to load clinic dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Logout
  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: "Sign Out of Clinic Portal?",
      message: "Are you sure you want to end your active clinic session?",
      confirmLabel: "Yes, Sign Out",
      variant: "danger",
      onConfirm: () => {
        clearAuth();
        router.push("/login");
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ==================== DOCTOR ACTIONS ====================
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !docSpecialty.trim()) return;

    setCreatingDoctor(true);
    setDoctorSuccessMsg(null);
    try {
      const created = await createClinicDoctor({
        name: docName.trim(),
        specialty: docSpecialty.trim(),
        symptoms_treated: docSymptoms.split(",").map((s) => s.trim()).filter(Boolean),
        fee: docFee,
      });
      setDoctors((prev) => [...prev, created]);
      setDocName("");
      setDocSpecialty("");
      setDocSymptoms("");
      setDocFee(50);
      setDoctorSuccessMsg(`Dr. ${created.name} added successfully!`);
      showToast(`Dr. ${created.name} added successfully!`);
      setIsAddDoctorModalOpen(false);
      setTimeout(() => setDoctorSuccessMsg(null), 4000);
    } catch (err: any) {
      showToast(err?.message || "Failed to add doctor", "error");
    } finally {
      setCreatingDoctor(false);
    }
  };

  const handleToggleDoctorToday = async (doctor: Doctor) => {
    setTogglingDoctorId(doctor.id);
    try {
      const updated = await toggleDoctorAvailabilityToday(doctor.id);
      setDoctors((prev) =>
        prev.map((d) => (d.id === doctor.id ? { ...d, is_available_today: updated.is_available_today } : d))
      );
      showToast(
        `Dr. ${doctor.name} marked as ${updated.is_available_today ? "Available" : "Off Duty"}`
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to toggle doctor availability", "error");
    } finally {
      setTogglingDoctorId(null);
    }
  };

  const openDoctorEditModal = (doctor: Doctor) => {
    setSelectedDoctorModal(doctor);
    setEditName(doctor.name);
    setEditSpecialty(doctor.specialty);
    setEditSymptoms((doctor.symptoms_treated || []).join(", "));
    setEditFee(doctor.fee || 50);
    setIsEditingDoctor(true);
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorModal || !editName.trim()) return;

    setUpdatingDoctor(true);
    try {
      const updated = await updateClinicDoctor(selectedDoctorModal.id, {
        name: editName.trim(),
        specialty: editSpecialty.trim(),
        fee: editFee,
        symptoms_treated: editSymptoms.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setIsEditingDoctor(false);
      setSelectedDoctorModal(null);
      showToast(`Dr. ${updated.name} profile updated!`);
    } catch (err: any) {
      showToast(err?.message || "Failed to update doctor", "error");
    } finally {
      setUpdatingDoctor(false);
    }
  };

  // ==================== SLOT ACTIONS ====================
  const handleCreateSingleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      showToast("Please select a physician", "error");
      return;
    }
    setCreatingSlot(true);
    setSlotSuccessMsg(null);
    try {
      const createdSlots = await createClinicSlots([
        {
          doctor_id: selectedDoctorId,
          slot_date: slotDate,
          start_time: slotStartTime,
          end_time: slotEndTime,
        },
      ]);
      setSlots((prev) => [...prev, ...createdSlots]);
      setSlotSuccessMsg("Consultation slot created!");
      showToast("Consultation slot created successfully!");
      setIsSingleSlotModalOpen(false);
      setTimeout(() => setSlotSuccessMsg(null), 3000);
    } catch (err: any) {
      showToast(err?.message || "Failed to create slot", "error");
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleCreateBulkSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkDoctorId) {
      showToast("Please select a physician for batch generation", "error");
      return;
    }
    setCreatingBulkSlots(true);
    setBulkSuccessMsg(null);

    try {
      const slotsToCreate: any[] = [];
      const start = new Date(bulkStartDate + "T00:00:00");
      const end = new Date(bulkEndDate + "T00:00:00");

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (!bulkDays.includes(dayOfWeek)) continue;

        const dateStr = d.toISOString().split("T")[0];

        // Parse day time into minutes
        const [startH, startM] = bulkStartTime.split(":").map(Number);
        const [endH, endM] = bulkEndTime.split(":").map(Number);
        const dayStartMin = startH * 60 + startM;
        const dayEndMin = endH * 60 + endM;

        let breakStartMin = 0;
        let breakEndMin = 0;
        if (hasBreak && breakStartTime && breakEndTime) {
          const [bSH, bSM] = breakStartTime.split(":").map(Number);
          const [bEH, bEM] = breakEndTime.split(":").map(Number);
          breakStartMin = bSH * 60 + bSM;
          breakEndMin = bEH * 60 + bEM;
        }

        let currMin = dayStartMin;
        while (currMin + slotInterval <= dayEndMin) {
          const nextMin = currMin + slotInterval;
          // Skip if overlaps break
          if (hasBreak && currMin < breakEndMin && nextMin > breakStartMin) {
            currMin = breakEndMin;
            continue;
          }

          const pad = (n: number) => n.toString().padStart(2, "0");
          const sTime = `${pad(Math.floor(currMin / 60))}:${pad(currMin % 60)}`;
          const eTime = `${pad(Math.floor(nextMin / 60))}:${pad(nextMin % 60)}`;

          slotsToCreate.push({
            doctor_id: bulkDoctorId,
            slot_date: dateStr,
            start_time: sTime,
            end_time: eTime,
          });

          currMin = nextMin;
        }
      }

      if (slotsToCreate.length === 0) {
        showToast("No valid slots matched your schedule and break parameters.", "error");
        setCreatingBulkSlots(false);
        return;
      }

      const created = await createClinicSlots(slotsToCreate);
      setSlots((prev) => [...prev, ...created]);
      setBulkSuccessMsg(`Successfully generated ${created.length} consultation slots!`);
      showToast(`Generated ${created.length} consultation slots!`);
      setIsBulkSlotModalOpen(false);
      setTimeout(() => setBulkSuccessMsg(null), 4000);
    } catch (err: any) {
      showToast(err?.message || "Failed to generate bulk slots", "error");
    } finally {
      setCreatingBulkSlots(false);
    }
  };

  const handleDeleteSlot = (slot: DoctorSlot) => {
    const doc = doctors.find((d) => d.id === slot.doctor_id);
    const docTitle = doc ? `Dr. ${doc.name}` : "Physician";
    setConfirmModal({
      isOpen: true,
      title: "Delete Consultation Slot?",
      message: `Are you sure you want to delete the slot for ${docTitle} on ${slot.slot_date} (${slot.start_time} - ${slot.end_time})?`,
      confirmLabel: "Yes, Delete Slot",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        setDeletingSlotId(slot.id);
        try {
          await deleteClinicSlot(slot.id);
          setSlots((prev) => prev.filter((s) => s.id !== slot.id));
          showToast("Consultation slot deleted");
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          showToast(err?.message || "Failed to delete slot", "error");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setDeletingSlotId(null);
        }
      },
    });
  };

  const handleToggleSlotDisabled = async (slot: DoctorSlot) => {
    setTogglingSlotId(slot.id);
    try {
      const updated = await toggleSlotDisabled(slot.id);
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
      showToast(
        updated.is_disabled ? "Slot disabled (hidden from patients)" : "Slot enabled and active"
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to toggle slot availability", "error");
    } finally {
      setTogglingSlotId(null);
    }
  };

  const handleManualBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForBooking || !manualPatientName.trim() || !manualPatientPhone.trim()) return;

    setBookingSlotLoading(true);
    try {
      await manualBookClinicSlot(selectedSlotForBooking.id, {
        patient_name: manualPatientName.trim(),
        patient_phone: manualPatientPhone.trim(),
        symptoms_reported: manualSymptoms.trim() || undefined,
      });

      // Update slot in state
      setSlots((prev) =>
        prev.map((s) =>
          s.id === selectedSlotForBooking.id
            ? { ...s, is_booked: true }
            : s
        )
      );

      // Refresh appointments to include new one
      loadDashboardData(true);

      setSelectedSlotForBooking(null);
      setManualPatientName("");
      setManualPatientPhone("");
      setManualSymptoms("");
      showToast("Slot successfully booked for patient!");
    } catch (err: any) {
      showToast(err?.message || "Failed to book slot", "error");
    } finally {
      setBookingSlotLoading(false);
    }
  };

  const handleManualUnbookSlot = (slot: DoctorSlot) => {
    const doc = doctors.find((d) => d.id === slot.doctor_id);
    const docTitle = doc ? `Dr. ${doc.name}` : "Physician";
    setConfirmModal({
      isOpen: true,
      title: "Release Booked Slot?",
      message: `Are you sure you want to release the ${slot.start_time} - ${slot.end_time} booked slot for ${docTitle} back to the clinic open pool?`,
      confirmLabel: "Yes, Release Slot",
      variant: "warning",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        setReleasingSlotId(slot.id);
        try {
          const updated = await manualUnbookClinicSlot(slot.id);
          setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
          loadDashboardData(true);
          showToast("Slot released back to open pool");
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          showToast(err?.message || "Failed to unbook slot", "error");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setReleasingSlotId(null);
        }
      },
    });
  };

  // ==================== SECURITY ACTIONS ====================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordSuccess(null);
    setChangePasswordError(null);

    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordError("New passwords do not match.");
      return;
    }
    if (changePasswordNew.length < 6) {
      setChangePasswordError("New password must be at least 6 characters.");
      return;
    }

    setChangePasswordLoading(true);
    try {
      await changePassword(changePasswordCurrent, changePasswordNew);
      setChangePasswordSuccess("Password successfully updated!");
      setChangePasswordCurrent("");
      setChangePasswordNew("");
      setChangePasswordConfirm("");
    } catch (err: any) {
      setChangePasswordError(err?.message || "Failed to update password.");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // ==================== LOOKUPS & FILTERED DATA ====================
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Doctors lookup map
  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    doctors.forEach((d) => map.set(d.id, d));
    return map;
  }, [doctors]);

  // Slots lookup map
  const slotMap = useMemo(() => {
    const map = new Map<string, DoctorSlot>();
    slots.forEach((s) => map.set(s.id, s));
    return map;
  }, [slots]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Search
      const searchMatch =
        !appointmentSearch ||
        appt.patient_name.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
        appt.patient_phone.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
        (appt.symptoms_reported && appt.symptoms_reported.toLowerCase().includes(appointmentSearch.toLowerCase()));

      // Doctor
      const doctorMatch =
        appointmentDoctorFilter === "all" || appt.doctor_id === appointmentDoctorFilter;

      return searchMatch && doctorMatch;
    });
  }, [appointments, appointmentSearch, appointmentDoctorFilter]);

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const docMatch = slotDoctorFilter === "all" || slot.doctor_id === slotDoctorFilter;
      const dateMatch = !slotDateFilter || slot.slot_date === slotDateFilter;

      let statusMatch = true;
      if (slotStatusFilter === "available") {
        statusMatch = !slot.is_booked && !slot.is_disabled;
      } else if (slotStatusFilter === "booked") {
        statusMatch = slot.is_booked;
      } else if (slotStatusFilter === "disabled") {
        statusMatch = Boolean(slot.is_disabled);
      }

      return docMatch && dateMatch && statusMatch;
    });
  }, [slots, slotDoctorFilter, slotDateFilter, slotStatusFilter]);

  // KPI Calculations
  const todayAppointmentsCount = useMemo(() => {
    return appointments.filter((a) => {
      const slot = slotMap.get(a.slot_id);
      return slot?.slot_date === todayStr;
    }).length;
  }, [appointments, slotMap, todayStr]);

  const activeDoctorsTodayCount = useMemo(() => {
    return doctors.filter((d) => d.is_available_today).length;
  }, [doctors]);

  const availableSlotsCount = useMemo(() => {
    return slots.filter((s) => !s.is_booked && !s.is_disabled).length;
  }, [slots]);

  // Snippet Copy Handlers
  const tenantToken = clinicProfile?.tenant_token || clinicProfile?.slug || getAuth().widget_token || getAuth().id || "demo-clinic-token";
  const widgetSnippet = `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/static/widget.js" data-tenant-token="${tenantToken}" async></script>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(widgetSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(tenantToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col md:flex-row bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* ==================== LEFT NAVIGATION SIDEBAR ==================== */}
      <aside className="w-full md:w-64 lg:w-72 bg-white dark:bg-[#0E1524] border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 z-30 transition-all md:h-screen md:max-h-screen">
        {/* Sidebar Header Brand */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shadow-teal-600/30 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 block truncate max-w-[150px]">
                {tenantName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400">
                  Clinic Portal
                </span>
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className={`p-3 space-y-1 flex-1 overflow-y-auto ${isMobileMenuOpen ? "block" : "hidden md:block"}`}>
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
            Medical Operations
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab("appointments");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "appointments"
                ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CalendarCheck className={`w-4 h-4 ${activeTab === "appointments" ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`} />
              <span>Appointments</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "appointments"
                ? "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {appointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("doctors");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "doctors"
                ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className={`w-4 h-4 ${activeTab === "doctors" ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`} />
              <span>Doctor Roster</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "doctors"
                ? "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {doctors.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("slots");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "slots"
                ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className={`w-4 h-4 ${activeTab === "slots" ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`} />
              <span>Consultation Slots</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "slots"
                ? "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {slots.length}
            </span>
          </button>

          <div className="px-3 pt-5 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
            Channels &amp; AI Setup
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab("whatsapp");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className={`w-4 h-4 ${activeTab === "whatsapp" ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`} />
              <span>WhatsApp AI</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("widget");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "widget"
                ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Code2 className={`w-4 h-4 ${activeTab === "widget" ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`} />
              <span>Web Voice Widget</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
              Embed
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("security");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shield className={`w-4 h-4 ${activeTab === "security" ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`} />
              <span>Account Security</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center">
                {tenantName.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-xs truncate max-w-[120px]">
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tenantName}</p>
                <p className="text-[10px] text-slate-400">Doctor Admin</p>
              </div>
            </div>
            <ThemeToggle className="w-8 h-8 rounded-lg" />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#0E1524]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Clinic Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {activeTab === "appointments" && "Appointments Feed"}
                {activeTab === "doctors" && "Doctor Roster & Schedules"}
                {activeTab === "slots" && "Consultation Slot Grid"}
                {activeTab === "whatsapp" && "WhatsApp AI Automation"}
                {activeTab === "widget" && "AI Receptionist Web Widget"}
                {activeTab === "security" && "Account Security"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              {activeTab === "appointments" && "Patient Appointments"}
              {activeTab === "doctors" && "Physician Roster & Specialists"}
              {activeTab === "slots" && "Booking Slots & Availability"}
              {activeTab === "whatsapp" && "WhatsApp Auto-Receptionist"}
              {activeTab === "widget" && "Web Voice & Chat Widget"}
              {activeTab === "security" && "Clinic Security & Credentials"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Actions per Tab */}
            {activeTab === "doctors" && (
              <button
                type="button"
                onClick={() => setIsAddDoctorModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Physician</span>
              </button>
            )}

            {activeTab === "slots" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkSlotModalOpen(true)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Batch Generate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSingleSlotModalOpen(true)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Single Slot</span>
                </button>
              </div>
            )}

            {/* Refresh Data Button */}
            <button
              type="button"
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              title={`Last refreshed at ${lastRefreshedAt.toLocaleTimeString()}`}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadDashboardData()}
              className="text-xs font-bold underline cursor-pointer hover:text-rose-900 dark:hover:text-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Executive KPI Stats Grid */}
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Today's Appointments */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Today's Appointments</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{todayAppointmentsCount}</h3>
                  <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">Scheduled Today</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Active Doctors on Duty */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Doctors On Duty Today</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeDoctorsTodayCount}</h3>
                  <span className="text-[11px] font-medium text-slate-500">/ {doctors.length} Total</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Available Booking Slots */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Consultation Slots</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{availableSlotsCount}</h3>
                  <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">Ready to Book</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: AI Voice & WhatsApp Receptionist */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">AI Receptionist Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Live 24/7 Active</h3>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Bilingual (Urdu &amp; English)</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ==================== TAB 1: APPOINTMENTS ==================== */}
          {activeTab === "appointments" && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={appointmentSearch}
                    onChange={(e) => setAppointmentSearch(e.target.value)}
                    placeholder="Search by patient name, phone, or symptoms..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                  {appointmentSearch && (
                    <button
                      type="button"
                      onClick={() => setAppointmentSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Selectors & Mode */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Doctor Selector */}
                  <select
                    value={appointmentDoctorFilter}
                    onChange={(e) => setAppointmentDoctorFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="all">All Doctors</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} ({d.specialty})
                      </option>
                    ))}
                  </select>

                  {/* View Mode Toggle */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAppointmentViewMode("cards")}
                      className={`p-1.5 rounded-lg transition-all ${
                        appointmentViewMode === "cards"
                          ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                      title="Cards View"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentViewMode("table")}
                      className={`p-1.5 rounded-lg transition-all ${
                        appointmentViewMode === "table"
                          ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                      title="Table View"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Appointments List / Grid */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                  <p className="text-xs">Loading patient appointments...</p>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center mx-auto">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No appointments found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {appointmentSearch || appointmentDoctorFilter !== "all"
                      ? "No appointments match your current filter parameters. Try clearing your filters."
                      : "Your AI receptionist is active and waiting for patients to book consultations via WhatsApp or website widget."}
                  </p>
                  {(appointmentSearch || appointmentDoctorFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppointmentSearch("");
                        setAppointmentDoctorFilter("all");
                      }}
                      className="text-xs font-semibold text-teal-600 hover:underline"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              ) : appointmentViewMode === "cards" ? (
                /* Cards Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAppointments.map((appt) => {
                    const doc = doctorMap.get(appt.doctor_id);
                    const slot = slotMap.get(appt.slot_id);
                    const slotDate = slot?.slot_date || appt.created_at?.split("T")[0];
                    const isToday = slotDate === todayStr;

                    return (
                      <div
                        key={appt.id}
                        className="p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 hover:border-teal-400/60 dark:hover:border-teal-500/40 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
                      >
                        <div>
                          {/* Card Top: Status & Date */}
                          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              <span>Confirmed</span>
                            </span>

                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className={`font-mono ${isToday ? "font-bold text-teal-600 dark:text-teal-400" : ""}`}>
                                {isToday ? "Today, " : ""}{slotDate}
                              </span>
                            </div>
                          </div>

                          {/* Patient Info */}
                          <div className="pt-3 space-y-1.5">
                            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                              {appt.patient_name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <a
                                href={`tel:${appt.patient_phone}`}
                                className="font-mono hover:text-teal-600 transition-colors"
                              >
                                {appt.patient_phone}
                              </a>
                            </div>
                          </div>

                          {/* Physician Assigned */}
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Physician:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {doc ? `Dr. ${doc.name}` : "Assigned Doctor"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Time Window:</span>
                              <span className="font-mono text-teal-600 dark:text-teal-400 font-bold">
                                {slot ? `${slot.start_time} - ${slot.end_time}` : "Scheduled"}
                              </span>
                            </div>
                            {doc?.fee !== undefined && (
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                                <span className="text-slate-500">Consultation Fee:</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  ${doc.fee}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Symptoms Reported */}
                          {appt.symptoms_reported && (
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                              "{appt.symptoms_reported}"
                            </p>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAppointmentModal(appt)}
                            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>

                          <a
                            href={`https://wa.me/${appt.patient_phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Dense Table View */
                <div className="rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">Patient Name</th>
                          <th className="p-4">Phone</th>
                          <th className="p-4">Physician</th>
                          <th className="p-4">Slot Date &amp; Time</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredAppointments.map((appt) => {
                          const doc = doctorMap.get(appt.doctor_id);
                          const slot = slotMap.get(appt.slot_id);
                          return (
                            <tr key={appt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                                {appt.patient_name}
                              </td>
                              <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                                {appt.patient_phone}
                              </td>
                              <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                                {doc ? `Dr. ${doc.name}` : "Assigned Doctor"}
                              </td>
                              <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-teal-600 dark:text-teal-400">{slot?.slot_date || appt.created_at?.split("T")[0]}</span>{" "}
                                &bull; {slot ? `${slot.start_time}-${slot.end_time}` : "Scheduled"}
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Confirmed
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedAppointmentModal(appt)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: DOCTORS ==================== */}
          {activeTab === "doctors" && (
            <div className="space-y-6">
              {doctorSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{doctorSuccessMsg}</span>
                </div>
              )}

              {doctors.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No physicians registered</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add your clinic's doctors so the AI receptionist can explain their medical specialties and schedule patient appointments.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddDoctorModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Doctor</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {doctors.map((doctor) => {
                    const isAvailable = doctor.is_available_today;

                    return (
                      <div
                        key={doctor.id}
                        className="p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 hover:border-teal-400/60 dark:hover:border-teal-500/40 transition-all shadow-xs flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Doctor Avatar & Identity */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                                {doctor.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                  Dr. {doctor.name}
                                </h4>
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 mt-0.5">
                                  {doctor.specialty}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => openDoctorEditModal(doctor)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Physician Profile"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Fee & Availability Info */}
                          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Consultation Fee</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
                                ${doctor.fee || 50}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Today's Duty</span>
                              <span className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${
                                isAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                                {isAvailable ? "On Duty" : "Off Duty"}
                              </span>
                            </div>
                          </div>

                          {/* Symptoms Treated Chips */}
                          {doctor.symptoms_treated && doctor.symptoms_treated.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                                Symptoms &amp; Conditions
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {doctor.symptoms_treated.slice(0, 4).map((symptom, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60"
                                  >
                                    {symptom}
                                  </span>
                                ))}
                                {doctor.symptoms_treated.length > 4 && (
                                  <span className="text-[10px] text-slate-400 self-center">
                                    +{doctor.symptoms_treated.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Bottom: Duty Toggle & Slot Generator Shortcut */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={togglingDoctorId === doctor.id}
                            onClick={() => handleToggleDoctorToday(doctor)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                              isAvailable
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {togglingDoctorId === doctor.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {togglingDoctorId === doctor.id
                                ? "Updating..."
                                : isAvailable
                                ? "Available Today"
                                : "Mark Available"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setBulkDoctorId(doctor.id);
                              setIsBulkSlotModalOpen(true);
                            }}
                            className="p-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-600 dark:text-slate-400 hover:text-teal-600 transition-colors"
                            title="Generate Slots for this Doctor"
                          >
                            <CalendarDays className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: CONSULTATION SLOTS ==================== */}
          {activeTab === "slots" && (
            <div className="space-y-4">
              {slotSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{slotSuccessMsg}</span>
                </div>
              )}

              {/* Slots Filter Header */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Doctor Selector */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Physician:</span>
                    <select
                      value={slotDoctorFilter}
                      onChange={(e) => setSlotDoctorFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="all">All Physicians</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.name} ({d.specialty})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Date:</span>
                    <input
                      type="date"
                      value={slotDateFilter}
                      onChange={(e) => setSlotDateFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                    {slotDateFilter && (
                      <button
                        type="button"
                        onClick={() => setSlotDateFilter("")}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                    {(["all", "available", "booked", "disabled"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSlotStatusFilter(status)}
                        className={`px-3 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer ${
                          slotStatusFilter === status
                            ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  Showing <strong>{filteredSlots.length}</strong> slots
                </div>
              </div>

              {/* Slots Grid */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                  <p className="text-xs">Loading consultation slots...</p>
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No consultation slots found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Generate booking intervals so patients can schedule appointments with your doctors.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsBulkSlotModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Batch Generate Slots</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredSlots.map((slot) => {
                    const doc = doctorMap.get(slot.doctor_id);
                    const isBooked = slot.is_booked;
                    const isDisabled = slot.is_disabled;

                    return (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between space-y-3 ${
                          isBooked
                            ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50"
                            : isDisabled
                            ? "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                            : "bg-white dark:bg-[#0E1524] border-slate-200 dark:border-slate-800 hover:border-teal-500"
                        }`}
                      >
                        <div>
                          {/* Slot Header */}
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {doc ? `Dr. ${doc.name}` : "Doctor"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isBooked
                                ? "bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300"
                                : isDisabled
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                            }`}>
                              {isBooked ? "Booked" : isDisabled ? "Disabled" : "Available"}
                            </span>
                          </div>

                          {/* Time & Date */}
                          <div className="pt-2">
                            <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                              {slot.start_time} - {slot.end_time}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              {slot.slot_date}
                            </p>
                          </div>
                        </div>

                        {/* Slot Actions */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-xs">
                          {!isBooked ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedSlotForBooking(slot)}
                                className="px-2.5 py-1 rounded-lg font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-[11px] transition-colors"
                              >
                                Book Now
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={togglingSlotId === slot.id}
                                  onClick={() => handleToggleSlotDisabled(slot)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
                                  title={isDisabled ? "Enable Slot" : "Disable Slot"}
                                >
                                  {togglingSlotId === slot.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                  ) : (
                                    <Ban className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingSlotId === slot.id}
                                  onClick={() => handleDeleteSlot(slot)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 disabled:opacity-50 transition-colors"
                                  title="Delete Slot"
                                >
                                  {deletingSlotId === slot.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={releasingSlotId === slot.id}
                              onClick={() => handleManualUnbookSlot(slot)}
                              className="w-full py-1 rounded-lg font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 text-[11px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              {releasingSlotId === slot.id && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              )}
                              <span>{releasingSlotId === slot.id ? "Releasing..." : "Release / Unbook"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 4: WHATSAPP AI ==================== */}
          {activeTab === "whatsapp" && (
            <WhatsAppConnectCard variant="clinic" />
          )}

          {/* ==================== TAB 5: WEB WIDGET ==================== */}
          {activeTab === "widget" && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    AI Web Voice &amp; Appointment Widget
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Embed the AI receptionist on your clinic's public website with a single line of JavaScript. Patients can click to talk or chat, discover doctor schedules, and book slots in seconds.
                  </p>
                </div>

                {/* Token Box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Clinic Security Token
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                      {tenantToken}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? "Copied Token" : "Copy Token"}</span>
                  </button>
                </div>

                {/* Snippet Embed Code Block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      HTML Embed Snippet (Paste before closing &lt;/body&gt; tag):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySnippet}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedSnippet ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet ? "Copied Code" : "Copy Snippet"}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
                    <code>{widgetSnippet}</code>
                  </pre>
                </div>

                {/* Test Widget Live Link */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500">
                    Test the live patient experience in a standalone browser sandbox:
                  </p>
                  <a
                    href={`/static/test_widget.html?token=${tenantToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Widget Sandbox &rarr;</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 6: SECURITY ==================== */}
          {activeTab === "security" && (
            <div className="max-w-2xl space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-teal-600" />
                    <span>Change Clinic Password</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Update your account credentials to keep patient data secure.
                  </p>
                </div>

                {changePasswordSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{changePasswordSuccess}</span>
                  </div>
                )}

                {changePasswordError && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{changePasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={changePasswordCurrent}
                      onChange={(e) => setChangePasswordCurrent(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={changePasswordNew}
                      onChange={(e) => setChangePasswordNew(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={changePasswordConfirm}
                      onChange={(e) => setChangePasswordConfirm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {changePasswordLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>{changePasswordLoading ? "Updating Password..." : "Update Password"}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================== MODAL: ADD PHYSICIAN ==================== */}
      {isAddDoctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0E1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Add New Physician</h3>
                  <p className="text-xs text-slate-500">Register a doctor to your clinic's AI booking roster</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDoctorModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Sarah Khan"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Specialty *
                  </label>
                  <input
                    type="text"
                    required
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    placeholder="e.g. Cardiologist"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Consultation Fee ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={docFee}
                    onChange={(e) => setDocFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Symptoms Treated (comma-separated)
                </label>
                <input
                  type="text"
                  value={docSymptoms}
                  onChange={(e) => setDocSymptoms(e.target.value)}
                  placeholder="e.g. Chest pain, palpitations, hypertension, dizziness"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingDoctor}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {creatingDoctor && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creatingDoctor ? "Saving..." : "Add Physician"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT PHYSICIAN ==================== */}
      {isEditingDoctor && selectedDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0E1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Dr. {selectedDoctorModal.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingDoctor(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDoctor} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Doctor Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Specialty
                  </label>
                  <input
                    type="text"
                    required
                    value={editSpecialty}
                    onChange={(e) => setEditSpecialty(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Consultation Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={editFee}
                    onChange={(e) => setEditFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Symptoms Treated
                </label>
                <input
                  type="text"
                  value={editSymptoms}
                  onChange={(e) => setEditSymptoms(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDoctor(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingDoctor}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updatingDoctor && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{updatingDoctor ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: BATCH GENERATE SLOTS ==================== */}
      {isBulkSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0E1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Batch Generate Slots</h3>
                  <p className="text-xs text-slate-500">Auto-create 15-60 min appointment slots across date ranges</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkSlotModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBulkSlots} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Physician *
                </label>
                <select
                  required
                  value={bulkDoctorId}
                  onChange={(e) => setBulkDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={bulkStartTime}
                    onChange={(e) => setBulkStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={bulkEndTime}
                    onChange={(e) => setBulkEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Duration
                  </label>
                  <select
                    value={slotInterval}
                    onChange={(e) => setSlotInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value={15}>15 mins</option>
                    <option value={20}>20 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              {/* Break Time */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Exclude Lunch / Staff Break
                  </span>
                  <input
                    type="checkbox"
                    checked={hasBreak}
                    onChange={(e) => setHasBreak(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                </div>
                {hasBreak && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Break Starts</span>
                      <input
                        type="time"
                        value={breakStartTime}
                        onChange={(e) => setBreakStartTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Break Ends</span>
                      <input
                        type="time"
                        value={breakEndTime}
                        onChange={(e) => setBreakEndTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Days of Week */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Generate on Days
                </label>
                <div className="flex items-center gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = bulkDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setBulkDays(bulkDays.filter((v) => v !== d.value));
                          } else {
                            setBulkDays([...bulkDays, d.value]);
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkSlotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBulkSlots}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {creatingBulkSlots && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creatingBulkSlots ? "Generating..." : "Generate Slots"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: SINGLE SLOT CREATOR ==================== */}
      {isSingleSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create Single Slot</h3>
              <button
                type="button"
                onClick={() => setIsSingleSlotModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleSlot} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Physician *
                </label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Slot Date
                </label>
                <input
                  type="date"
                  required
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSingleSlotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSlot}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {creatingSlot && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creatingSlot ? "Saving..." : "Create Slot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: MANUAL BOOK SLOT ==================== */}
      {selectedSlotForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Manual Patient Booking</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedSlotForBooking.slot_date} &bull; {selectedSlotForBooking.start_time}-{selectedSlotForBooking.end_time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlotForBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualBookSlot} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualPatientName}
                  onChange={(e) => setManualPatientName(e.target.value)}
                  placeholder="e.g. Ali Ahmed"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={manualPatientPhone}
                  onChange={(e) => setManualPatientPhone(e.target.value)}
                  placeholder="e.g. +923001234567"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Symptoms / Reason for Visit
                </label>
                <textarea
                  rows={2}
                  value={manualSymptoms}
                  onChange={(e) => setManualSymptoms(e.target.value)}
                  placeholder="e.g. Fever, regular checkup..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlotForBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSlotLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {bookingSlotLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{bookingSlotLoading ? "Confirming..." : "Confirm Booking"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: APPOINTMENT DETAILS ==================== */}
      {selectedAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0E1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Appointment Details
                  </h3>
                  <span className="font-mono text-xs text-slate-400">ID: {selectedAppointmentModal.id.slice(0, 8)}...</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointmentModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Patient Name</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">
                    {selectedAppointmentModal.patient_name}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Contact Phone</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">
                    {selectedAppointmentModal.patient_phone}
                  </span>
                </div>
              </div>

              {(() => {
                const doc = doctorMap.get(selectedAppointmentModal.doctor_id);
                const slot = slotMap.get(selectedAppointmentModal.slot_id);
                const slotDate = slot?.slot_date || selectedAppointmentModal.created_at?.split("T")[0];
                return (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Scheduled Date:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {slotDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Consultation Time:</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                        {slot ? `${slot.start_time} - ${slot.end_time}` : "Scheduled Slot"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Physician:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {doc ? `Dr. ${doc.name} (${doc.specialty})` : "Assigned Doctor"}
                      </span>
                    </div>
                    {doc?.fee !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Fee:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          ${doc.fee}
                        </span>
                      </div>
                    )}
                    {selectedAppointmentModal.symptoms_reported && (
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-semibold">Symptoms Reported:</span>
                        <p className="text-slate-700 dark:text-slate-300 italic">{selectedAppointmentModal.symptoms_reported}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 pt-2">
                <a
                  href={`tel:${selectedAppointmentModal.patient_phone}`}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-center flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Patient</span>
                </a>
                <a
                  href={`https://wa.me/${selectedAppointmentModal.patient_phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-center flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
              statusToast.type === "error"
                ? "bg-rose-50/95 dark:bg-rose-950/95 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800"
                : "bg-emerald-50/95 dark:bg-emerald-950/95 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
            }`}
          >
            {statusToast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
