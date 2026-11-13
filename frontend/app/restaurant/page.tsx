"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  BookOpen,
  LayoutGrid,
  Plus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Phone,
  Search,
  Users,
  Calendar,
  Clock,
  ToggleLeft,
  ToggleRight,
  ShoppingBag,
  Code2,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Menu as MenuIcon,
  Sparkles,
  MessageSquare,
  ChefHat,
  Truck,
  PackageCheck,
  XCircle,
  Flame,
  MapPin,
  Shield,
  KeyRound,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Coffee,
  CheckCheck,
  Timer,
  X,
  Bot,
  Trash2,
  Edit,
  Printer,
  Layers,
  Tag,
  Monitor,
  Tv,
  Bike,
  Store,
  ArrowRight,
  Dices,
  Loader2,
  Settings,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import {
  getAuth,
  clearAuth,
  getRestaurantMenu,
  createRestaurantMenuItem,
  updateRestaurantMenuItem,
  deleteRestaurantMenuItem,
  toggleMenuItemAvailability,
  getRestaurantCategories,
  createRestaurantCategory,
  deleteRestaurantCategory,
  getRestaurantTables,
  createRestaurantTable,
  getRestaurantReservations,
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  getKitchenPin,
  updateKitchenPin,
  getScreenPins,
  updateScreenPins,
  ScreenPinsData,
  getRestaurantSettings,
  updateRestaurantSettings,
  RestaurantSettingsData,
  getProfile,
  changePassword,
  MenuItem,
  MenuItemVariant,
  MenuItemAddon,
  MenuCategory,
  RestaurantTable,
  RestaurantReservation,
  RestaurantOrder,
  RestaurantOrderItem,
  API_BASE,
} from "@/lib/api";
import WhatsAppConnectCard from "@/src/components/WhatsAppConnectCard";
import ConfirmationModal from "@/src/components/ConfirmationModal";

export default function RestaurantDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "orders" | "menu" | "reservations" | "tables" | "kitchen_kds" | "whatsapp" | "widget" | "settings"
  >("orders");
  const [tenantName, setTenantName] = useState<string>("Bistro & Grill");
  const [tenantSlug, setTenantSlug] = useState<string>("bistro");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile & Widget State
  const [restaurantProfile, setRestaurantProfile] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedKitchenUrl, setCopiedKitchenUrl] = useState(false);
  const [copiedScreenUrl, setCopiedScreenUrl] = useState<"kitchen" | "rider" | "pos" | null>(null);
  const [copiedPinType, setCopiedPinType] = useState<"kitchen" | "rider" | "pos" | null>(null);

  // Operational Screen PINs State (Kitchen, Rider, POS - default 1234)
  const [kitchenPin, setKitchenPin] = useState("1234");
  const [newKitchenPin, setNewKitchenPin] = useState("1234");

  const [riderPin, setRiderPin] = useState("1234");
  const [newRiderPin, setNewRiderPin] = useState("1234");

  const [posPin, setPosPin] = useState("1234");
  const [newPosPin, setNewPosPin] = useState("1234");

  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);

  // Restaurant Profile & Charges Settings State
  const [settingsName, setSettingsName] = useState<string>("");
  const [settingsDeliveryCharges, setSettingsDeliveryCharges] = useState<number | string>(0);
  const [settingsServiceCharges, setSettingsServiceCharges] = useState<number | string>(0);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Change Password State
  const [changePasswordCurrent, setChangePasswordCurrent] = useState("");
  const [changePasswordNew, setChangePasswordNew] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Core Data State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [reservations, setReservations] = useState<RestaurantReservation[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);

  // Menu Tab Sub-view Toggle: "items" | "categories"
  const [menuSubView, setMenuSubView] = useState<"items" | "categories">("items");

  // Orders Filters & Search
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");

  // Reservations Filters
  const [reservationSearch, setReservationSearch] = useState("");
  const [reservationDateFilter, setReservationDateFilter] = useState("");

  // Menu Filters
  const [menuCategoryFilter, setMenuCategoryFilter] = useState("All");
  const [menuSearch, setMenuSearch] = useState("");

  // Loading & Updating States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [autoPoll, setAutoPoll] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

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

  // Menu Item Modal State (Create & Edit)
  const [isMenuItemModalOpen, setIsMenuItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormName, setItemFormName] = useState("");
  const [itemFormCategory, setItemFormCategory] = useState("Mains");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [itemFormPrice, setItemFormPrice] = useState<number>(450);
  const [itemFormDescription, setItemFormDescription] = useState("");
  const [itemFormIsAvailable, setItemFormIsAvailable] = useState(true);
  const [itemFormVariants, setItemFormVariants] = useState<MenuItemVariant[]>([]);
  const [itemFormAddons, setItemFormAddons] = useState<MenuItemAddon[]>([]);
  const [savingItem, setSavingItem] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormName, setCategoryFormName] = useState("");
  const [categoryFormDescription, setCategoryFormDescription] = useState("");
  const [categoryFormOrder, setCategoryFormOrder] = useState<number>(0);
  const [savingCategory, setSavingCategory] = useState(false);

  // Table Modal State
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [tableCapacity, setTableCapacity] = useState<number>(4);
  const [creatingTable, setCreatingTable] = useState(false);

  // Order Details / Receipt Modal
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<RestaurantOrder | null>(null);

  // Auth Guard
  useEffect(() => {
    const auth = getAuth();
    if (!auth.token) {
      router.push("/login");
      return;
    }
    if (auth.business_type && auth.business_type !== "restaurant") {
      router.push("/clinic");
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
      const [menuData, catData, tablesData, resData, ordersData, profileData, screenPinsData, settingsData] = await Promise.all([
        getRestaurantMenu().catch(() => []),
        getRestaurantCategories().catch(() => []),
        getRestaurantTables().catch(() => []),
        getRestaurantReservations().catch(() => []),
        getRestaurantOrders().catch(() => []),
        getProfile().catch(() => null),
        getScreenPins().catch(async () => {
          const kp = await getKitchenPin().catch(() => ({ kitchen_pin: "1234", slug: "" }));
          return {
            kitchen_pin: kp.kitchen_pin || "1234",
            rider_pin: "1234",
            pos_pin: "1234",
            slug: kp.slug || "",
          };
        }),
        getRestaurantSettings().catch(() => null),
      ]);

      setMenuItems(menuData || []);
      setCategoriesList(catData || []);
      setTables(tablesData || []);
      setReservations(resData || []);
      setOrders(ordersData || []);

      if (screenPinsData) {
        const kPin = screenPinsData.kitchen_pin || "1234";
        const rPin = screenPinsData.rider_pin || "1234";
        const pPin = screenPinsData.pos_pin || "1234";

        setKitchenPin(kPin);
        setNewKitchenPin(kPin);
        setRiderPin(rPin);
        setNewRiderPin(rPin);
        setPosPin(pPin);
        setNewPosPin(pPin);

        if (screenPinsData.slug) {
          setTenantSlug(screenPinsData.slug);
        }
      }

      if (settingsData) {
        if (settingsData.name) {
          setTenantName(settingsData.name);
          setSettingsName(settingsData.name);
        }
        if (settingsData.slug) {
          setTenantSlug(settingsData.slug);
        }
        setSettingsDeliveryCharges(settingsData.delivery_charges ?? 0);
        setSettingsServiceCharges(settingsData.service_charges ?? 0);
      }

      if (profileData) {
        setRestaurantProfile(profileData);
        if (!settingsData) {
          if (profileData.business_name || profileData.name) {
            setTenantName(profileData.business_name || profileData.name);
            setSettingsName(profileData.business_name || profileData.name);
          }
          if (profileData.slug) {
            setTenantSlug(profileData.slug);
          }
          setSettingsDeliveryCharges(profileData.delivery_charges ?? 0);
          setSettingsServiceCharges(profileData.service_charges ?? 0);
        }
      }
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      setError(err?.message || "Failed to load restaurant dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time Polling for Kitchen Orders (Every 10 seconds if autoPoll is enabled)
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      getRestaurantOrders()
        .then((latestOrders) => {
          if (latestOrders && Array.isArray(latestOrders)) {
            setOrders(latestOrders);
            setLastRefreshedAt(new Date());
          }
        })
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [autoPoll]);

  // Handle Logout
  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: "Sign Out of Restaurant Portal?",
      message: "Are you sure you want to log out from your active restaurant management session?",
      confirmLabel: "Yes, Sign Out",
      variant: "danger",
      onConfirm: () => {
        clearAuth();
        router.push("/login");
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Toast Helper
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setStatusToast({ msg, type });
    setTimeout(() => setStatusToast(null), 3500);
  };

  // ==================== ORDER STATUS ACTIONS ====================
  const handleUpdateOrderStatus = async (
    order: RestaurantOrder,
    targetStatus: "received" | "in_kitchen" | "ready" | "completed" | "cancelled"
  ) => {
    if (targetStatus === "cancelled") {
      setConfirmModal({
        isOpen: true,
        title: `Cancel Order #${order.order_number || order.id.slice(0, 6)}?`,
        message: `Are you sure you want to cancel this order for ${order.customer_name || "Guest"}? This order will be marked as cancelled in the database.`,
        confirmLabel: "Yes, Cancel Order",
        variant: "danger",
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }));
          setUpdatingOrderId(order.id);
          try {
            const updated = await updateRestaurantOrderStatus(order.id, "cancelled");
            setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
            if (selectedReceiptOrder && selectedReceiptOrder.id === order.id) {
              setSelectedReceiptOrder(updated);
            }
            showToast(`Order #${order.order_number || order.id.slice(0, 6)} cancelled`);
            setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          } catch (err: any) {
            showToast(err?.message || "Failed to cancel order", "error");
            setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          } finally {
            setUpdatingOrderId(null);
          }
        },
      });
      return;
    }

    setUpdatingOrderId(order.id);
    try {
      const updated = await updateRestaurantOrderStatus(order.id, targetStatus);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (selectedReceiptOrder && selectedReceiptOrder.id === order.id) {
        setSelectedReceiptOrder(updated);
      }
      showToast(`Order #${order.order_number || order.id.slice(0, 6)} updated to ${targetStatus.replace("_", " ")}!`);
    } catch (err: any) {
      showToast(err?.message || "Failed to update order status", "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ==================== OPERATIONAL SCREEN PINS MANAGEMENT ====================
  const generateRandomPin = (screenType: "kitchen" | "rider" | "pos") => {
    // Generate clean 4-digit PIN between 1000 and 9999
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    if (screenType === "kitchen") {
      setNewKitchenPin(generated);
      showToast(`Generated Kitchen PIN: ${generated}`);
    } else if (screenType === "rider") {
      setNewRiderPin(generated);
      showToast(`Generated Rider PIN: ${generated}`);
    } else if (screenType === "pos") {
      setNewPosPin(generated);
      showToast(`Generated POS PIN: ${generated}`);
    }
  };

  const handleCopyPin = (pinValue: string, type: "kitchen" | "rider" | "pos") => {
    navigator.clipboard.writeText(pinValue);
    setCopiedPinType(type);
    showToast(`${type.toUpperCase()} PIN (${pinValue}) copied to clipboard!`);
    setTimeout(() => setCopiedPinType(null), 2500);
  };

  const handleSaveIndividualPin = async (screenType: "kitchen" | "rider" | "pos") => {
    const val = screenType === "kitchen" ? newKitchenPin : screenType === "rider" ? newRiderPin : newPosPin;
    if (!val.trim() || val.trim().length < 4) {
      showToast(`${screenType.toUpperCase()} PIN must be at least 4 digits`, "error");
      return;
    }
    setIsUpdatingPin(true);
    setPinSuccessMsg(null);
    try {
      const payload: { kitchen_pin?: string; rider_pin?: string; pos_pin?: string } = {};
      if (screenType === "kitchen") payload.kitchen_pin = val.trim();
      if (screenType === "rider") payload.rider_pin = val.trim();
      if (screenType === "pos") payload.pos_pin = val.trim();

      const res = await updateScreenPins(payload);
      if (res.kitchen_pin) setKitchenPin(res.kitchen_pin);
      if (res.rider_pin) setRiderPin(res.rider_pin);
      if (res.pos_pin) setPosPin(res.pos_pin);

      const title = screenType === "kitchen" ? "Kitchen Display" : screenType === "rider" ? "Rider App" : "POS Terminal";
      setPinSuccessMsg(`${title} PIN successfully updated to ${val.trim()}!`);
      showToast(`${title} PIN updated to ${val.trim()}!`);
      setTimeout(() => setPinSuccessMsg(null), 4000);
    } catch (err: any) {
      showToast(err?.message || `Failed to update ${screenType} PIN`, "error");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleSaveAllPins = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newKitchenPin.trim().length < 4 || newRiderPin.trim().length < 4 || newPosPin.trim().length < 4) {
      showToast("All screen PINs must be at least 4 digits", "error");
      return;
    }
    setIsUpdatingPin(true);
    setPinSuccessMsg(null);
    try {
      const res = await updateScreenPins({
        kitchen_pin: newKitchenPin.trim(),
        rider_pin: newRiderPin.trim(),
        pos_pin: newPosPin.trim(),
      });
      setKitchenPin(res.kitchen_pin || newKitchenPin.trim());
      setRiderPin(res.rider_pin || newRiderPin.trim());
      setPosPin(res.pos_pin || newPosPin.trim());
      setPinSuccessMsg("All 3 Station Screen PINs saved successfully!");
      showToast("All station screen PINs saved successfully!");
      setTimeout(() => setPinSuccessMsg(null), 4000);
    } catch (err: any) {
      showToast(err?.message || "Failed to update Screen PINs", "error");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleResetAllPinsToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: "Reset All Station PINs to Default (1234)?",
      message: "Are you sure you want to reset the Kitchen Display, Rider App, and POS Terminal PINs to default '1234'? Anyone with this code will be able to access the station terminals.",
      confirmLabel: "Yes, Reset All PINs",
      variant: "warning",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        setIsUpdatingPin(true);
        setPinSuccessMsg(null);
        try {
          const res = await updateScreenPins({
            kitchen_pin: "1234",
            rider_pin: "1234",
            pos_pin: "1234",
          });
          setKitchenPin("1234");
          setNewKitchenPin("1234");
          setRiderPin("1234");
          setNewRiderPin("1234");
          setPosPin("1234");
          setNewPosPin("1234");
          setPinSuccessMsg("All screen PINs reset to default (1234)");
          showToast("All screen PINs reset to 1234!");
          setTimeout(() => setPinSuccessMsg(null), 4000);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          showToast(err?.message || "Failed to reset PINs", "error");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setIsUpdatingPin(false);
        }
      },
    });
  };

  // Backward compatibility alias
  const handleSaveKitchenPin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveIndividualPin("kitchen");
  };

  // ==================== MENU ITEM ACTIONS ====================
  const openNewItemModal = () => {
    setEditingItemId(null);
    setItemFormName("");
    const defaultCat = categoriesList[0]?.name || "Mains";
    setItemFormCategory(defaultCat);
    setIsCustomCategory(false);
    setNewCategoryInput("");
    setItemFormPrice(450);
    setItemFormDescription("");
    setItemFormIsAvailable(true);
    setItemFormVariants([]);
    setItemFormAddons([]);
    setIsMenuItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItemId(item.id);
    setItemFormName(item.name);
    const itemCat = item.category || categoriesList[0]?.name || "Mains";
    setItemFormCategory(itemCat);
    const exists = categoriesList.some((c) => c.name.toLowerCase() === itemCat.toLowerCase());
    setIsCustomCategory(!exists);
    setNewCategoryInput(!exists ? itemCat : "");
    setItemFormPrice(Number(item.price) || 0);
    setItemFormDescription(item.description || "");
    setItemFormIsAvailable(item.is_available);
    setItemFormVariants(item.variants ? [...item.variants] : []);
    setItemFormAddons(item.addons ? [...item.addons] : []);
    setIsMenuItemModalOpen(true);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormName.trim()) {
      showToast("Please enter a dish name", "error");
      return;
    }

    const finalCategory = (isCustomCategory ? newCategoryInput : itemFormCategory).trim() || "Mains";

    setSavingItem(true);
    try {
      // If user typed a new category, automatically create and save it to categories as well
      const existingCat = categoriesList.find(
        (c) => c.name.toLowerCase() === finalCategory.toLowerCase()
      );
      if (!existingCat && finalCategory) {
        try {
          const createdCat = await createRestaurantCategory({
            name: finalCategory,
            display_order: categoriesList.length + 1,
          });
          setCategoriesList((prev) => [...prev, createdCat].sort((a, b) => a.display_order - b.display_order));
        } catch {
          // Continue saving dish even if category already existed on backend
        }
      }

      const payload = {
        name: itemFormName.trim(),
        category: finalCategory,
        price: Number(itemFormPrice) || 0,
        description: itemFormDescription.trim(),
        is_available: itemFormIsAvailable,
        variants: itemFormVariants.filter((v) => v.name.trim()),
        addons: itemFormAddons.filter((a) => a.name.trim()),
      };

      if (editingItemId) {
        const updated = await updateRestaurantMenuItem(editingItemId, payload);
        setMenuItems((prev) => prev.map((m) => (m.id === editingItemId ? updated : m)));
        showToast(`Updated "${updated.name}" successfully!`);
      } else {
        const created = await createRestaurantMenuItem(payload);
        setMenuItems((prev) => [...prev, created]);
        showToast(`Added "${created.name}" to menu catalog!`);
      }
      setIsMenuItemModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || "Failed to save menu item", "error");
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteMenuItem = (item: MenuItem) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Dish "${item.name}"?`,
      message: `Are you sure you want to remove "${item.name}" from your restaurant menu? This item will no longer appear on online orders, POS screen, or WhatsApp AI bot recommendations.`,
      confirmLabel: "Yes, Delete Dish",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        setDeletingItemId(item.id);
        try {
          await deleteRestaurantMenuItem(item.id);
          setMenuItems((prev) => prev.filter((m) => m.id !== item.id));
          showToast(`Deleted "${item.name}"`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          showToast(err?.message || "Failed to delete item", "error");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setDeletingItemId(null);
        }
      },
    });
  };

  const handleToggleMenuAvailability = async (item: MenuItem) => {
    const nextState = !item.is_available;
    setTogglingItemId(item.id);
    try {
      const updated = await toggleMenuItemAvailability(item.id, nextState);
      setMenuItems((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
      showToast(`"${item.name}" marked as ${nextState ? "In Stock" : "Sold Out"}`);
    } catch (err: any) {
      showToast(err?.message || "Failed to toggle item availability", "error");
    } finally {
      setTogglingItemId(null);
    }
  };

  // Add/Remove dynamic Variants
  const handleAddVariantRow = () => {
    setItemFormVariants((prev) => [...prev, { name: "", price: itemFormPrice }]);
  };
  const handleUpdateVariantRow = (index: number, field: "name" | "price", value: string | number) => {
    setItemFormVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };
  const handleRemoveVariantRow = (index: number) => {
    setItemFormVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Add/Remove dynamic Add-ons
  const handleAddAddonRow = () => {
    setItemFormAddons((prev) => [...prev, { name: "", price: 50 }]);
  };
  const handleUpdateAddonRow = (index: number, field: "name" | "price", value: string | number) => {
    setItemFormAddons((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };
  const handleRemoveAddonRow = (index: number) => {
    setItemFormAddons((prev) => prev.filter((_, i) => i !== index));
  };

  // ==================== CATEGORY ACTIONS ====================
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) {
      showToast("Please enter category name", "error");
      return;
    }
    setSavingCategory(true);
    try {
      const created = await createRestaurantCategory({
        name: categoryFormName.trim(),
        description: categoryFormDescription.trim() || undefined,
        display_order: Number(categoryFormOrder) || 0,
      });
      setCategoriesList((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
      showToast(`Category "${created.name}" created!`);
      setIsCategoryModalOpen(false);
      setCategoryFormName("");
      setCategoryFormDescription("");
      setCategoryFormOrder(0);
    } catch (err: any) {
      showToast(err?.message || "Failed to create category", "error");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = (cat: MenuCategory) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Category "${cat.name}"?`,
      message: `Are you sure you want to remove category "${cat.name}"? Existing menu dishes in this category will remain in your menu database.`,
      confirmLabel: "Yes, Delete Category",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        setDeletingCategoryId(cat.id);
        try {
          await deleteRestaurantCategory(cat.id);
          setCategoriesList((prev) => prev.filter((c) => c.id !== cat.id));
          showToast(`Category "${cat.name}" deleted`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          showToast(err?.message || "Failed to delete category", "error");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setDeletingCategoryId(null);
        }
      },
    });
  };

  // ==================== TABLE ACTIONS ====================
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    setCreatingTable(true);
    try {
      const created = await createRestaurantTable({
        table_number: tableNumber.trim(),
        capacity: tableCapacity,
      });
      setTables((prev) => [...prev, created]);
      setTableNumber("");
      setTableCapacity(4);
      showToast(`Table ${created.table_number} added!`);
      setIsAddTableModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || "Failed to add table", "error");
    } finally {
      setCreatingTable(false);
    }
  };

  // ==================== RESTAURANT SETTINGS ACTIONS ====================
  const handleSaveRestaurantSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName.trim()) {
      showToast("Please enter a valid restaurant name", "error");
      return;
    }
    setSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const delCharges = settingsDeliveryCharges === "" ? 0 : Math.max(0, Number(settingsDeliveryCharges) || 0);
      const srvCharges = settingsServiceCharges === "" ? 0 : Math.max(0, Number(settingsServiceCharges) || 0);
      const res = await updateRestaurantSettings({
        name: settingsName.trim(),
        delivery_charges: delCharges,
        service_charges: srvCharges,
      });
      setTenantName(res.name);
      setSettingsName(res.name);
      setSettingsDeliveryCharges(res.delivery_charges);
      setSettingsServiceCharges(res.service_charges);
      if (res.slug) setTenantSlug(res.slug);
      setSettingsSuccessMsg("Restaurant name and charges updated!");
      showToast("Restaurant settings saved!");
      setTimeout(() => setSettingsSuccessMsg(null), 4000);
    } catch (err: any) {
      showToast(err?.message || "Failed to update restaurant settings", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // ==================== SECURITY & PASSWORD ACTIONS ====================
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

  // ==================== FILTERED DATA ====================
  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "received" || o.status === "in_kitchen").length;
  }, [orders]);

  const receivedOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "received").length;
  }, [orders]);

  const readyOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "ready").length;
  }, [orders]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "completed").length;
  }, [orders]);

  const totalRevenueRs = useMemo(() => {
    return orders
      .filter((o) => o.status === "completed" || o.status === "ready" || o.status === "in_kitchen")
      .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      let matchesStatus = true;
      if (orderStatusFilter !== "all") {
        matchesStatus = o.status === orderStatusFilter;
      }

      // Order type filter
      let matchesType = true;
      if (orderTypeFilter !== "all") {
        matchesType = o.order_type === orderTypeFilter;
      }

      // Search filter
      let matchesSearch = true;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matchesCustomer = o.customer_name?.toLowerCase().includes(q);
        const matchesPhone = o.customer_phone?.toLowerCase().includes(q);
        const matchesNumber = o.order_number?.toLowerCase().includes(q);
        const matchesId = o.id.toLowerCase().includes(q);
        const matchesItems = o.items?.some((item) => item.name?.toLowerCase().includes(q));
        matchesSearch = Boolean(matchesCustomer || matchesPhone || matchesNumber || matchesId || matchesItems);
      }

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [orders, orderStatusFilter, orderTypeFilter, orderSearch]);

  const availableCategories = useMemo(() => {
    const list: string[] = ["All"];
    categoriesList.forEach((c) => {
      if (!list.includes(c.name)) list.push(c.name);
    });
    menuItems.forEach((m) => {
      if (m.category && !list.includes(m.category)) list.push(m.category);
    });
    return list;
  }, [categoriesList, menuItems]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat =
        menuCategoryFilter === "All" ||
        item.category.toLowerCase() === menuCategoryFilter.toLowerCase();
      const matchSearch =
        !menuSearch ||
        item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(menuSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [menuItems, menuCategoryFilter, menuSearch]);

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchSearch =
        !reservationSearch ||
        r.customer_name.toLowerCase().includes(reservationSearch.toLowerCase()) ||
        r.customer_phone.toLowerCase().includes(reservationSearch.toLowerCase());
      const matchDate = !reservationDateFilter || r.booking_date === reservationDateFilter;
      return matchSearch && matchDate;
    });
  }, [reservations, reservationSearch, reservationDateFilter]);

  // URLs & Snippets
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const kitchenDisplayUrl = `${origin}/kitchen?slug=${tenantSlug || "restaurant"}`;
  const riderPortalUrl = `${origin}/rider?slug=${tenantSlug || "restaurant"}`;
  const posTerminalUrl = `${origin}/pos?slug=${tenantSlug || "restaurant"}`;

  const tenantToken =
    restaurantProfile?.tenant_token || restaurantProfile?.slug || getAuth().widget_token || getAuth().id || "restaurant-token";
  const widgetSnippet = `<script src="${origin}/static/widget.js" data-tenant-token="${tenantToken}" async></script>`;

  const handleCopyScreenUrl = (type: "kitchen" | "rider" | "pos") => {
    const url = type === "kitchen" ? kitchenDisplayUrl : type === "rider" ? riderPortalUrl : posTerminalUrl;
    navigator.clipboard.writeText(url);
    setCopiedScreenUrl(type);
    const label = type === "kitchen" ? "Kitchen Display (KDS)" : type === "rider" ? "Rider App" : "POS Terminal";
    showToast(`${label} URL copied to clipboard!`);
    setTimeout(() => setCopiedScreenUrl(null), 2500);
  };

  const handleCopyKitchenUrl = () => {
    handleCopyScreenUrl("kitchen");
  };

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
    <div className="h-screen w-full overflow-hidden flex flex-col md:flex-row bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 font-sans selection:bg-amber-500 selection:text-white">
      {/* ==================== LEFT NAVIGATION SIDEBAR ==================== */}
      <aside className="w-full md:w-64 lg:w-72 bg-white dark:bg-[#0E1524] border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 z-30 transition-all md:h-screen md:max-h-screen">
        {/* Sidebar Header Brand */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 block truncate max-w-[150px]">
                {tenantName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                  Restaurant Suite
                </span>
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className={`p-3 space-y-1 flex-1 overflow-y-auto ${isMobileMenuOpen ? "block" : "hidden md:block"}`}>
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
            Operations &amp; POS
          </div>

          {/* Orders Review Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("orders");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "orders"
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ChefHat className={`w-4 h-4 ${activeTab === "orders" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
              <span>Orders Review</span>
            </div>
            {activeOrdersCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white animate-pulse">
                {activeOrdersCount}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                {orders.length}
              </span>
            )}
          </button>

          {/* Menu Catalog Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("menu");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "menu"
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className={`w-4 h-4 ${activeTab === "menu" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
              <span>Menu &amp; Categories</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "menu"
                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {menuItems.length}
            </span>
          </button>

          {/* Table Bookings */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("reservations");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "reservations"
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className={`w-4 h-4 ${activeTab === "reservations" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
              <span>Table Bookings</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "reservations"
                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {reservations.length}
            </span>
          </button>

          {/* Dining Tables */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("tables");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "tables"
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutGrid className={`w-4 h-4 ${activeTab === "tables" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
              <span>Dining Tables</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "tables"
                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {tables.length}
            </span>
          </button>

          {/* Station Operations Screens: POS, Kitchen KDS, Rider Portal */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("kitchen_kds");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "kitchen_kds"
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Monitor className={`w-4 h-4 ${activeTab === "kitchen_kds" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
              <span>Station Screens</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
              POS · KDS · Rider
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
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className={`w-4 h-4 ${activeTab === "whatsapp" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
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
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Code2 className={`w-4 h-4 ${activeTab === "widget" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
              <span>Web Voice Widget</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
              Embed
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className={`w-4 h-4 ${activeTab === "settings" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
              <span>Settings</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
                {tenantName.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-xs truncate max-w-[120px]">
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tenantName}</p>
                <p className="text-[10px] text-slate-400">Manager &amp; POS</p>
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
              <span>Restaurant Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {activeTab === "orders" && "Orders Management & Review"}
                {activeTab === "menu" && "Menu Catalog & Categories"}
                {activeTab === "reservations" && "Table Reservations"}
                {activeTab === "tables" && "Dining Tables"}
                {activeTab === "kitchen_kds" && "Station Operations Screens"}
                {activeTab === "whatsapp" && "WhatsApp AI Automation"}
                {activeTab === "widget" && "AI Receptionist Web Widget"}
                {activeTab === "settings" && "Restaurant Settings"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              {activeTab === "orders" && "Customer Orders Review & Auditing"}
              {activeTab === "menu" && "Menu Items & Categories (POS)"}
              {activeTab === "reservations" && "Table Reservations Feed"}
              {activeTab === "tables" && "Dining Floor Configuration"}
              {activeTab === "kitchen_kds" && "Live Station Screens (POS · Kitchen · Rider)"}
              {activeTab === "whatsapp" && "WhatsApp Auto-Receptionist"}
              {activeTab === "widget" && "Web Voice & Chat Widget"}
              {activeTab === "settings" && "Restaurant Settings, Charges & Security"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Actions per Tab */}
            {activeTab === "menu" && menuSubView === "items" && (
              <button
                type="button"
                onClick={openNewItemModal}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Dish</span>
              </button>
            )}

            {activeTab === "menu" && menuSubView === "categories" && (
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            )}

            {activeTab === "tables" && (
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Table</span>
              </button>
            )}

            {activeTab === "kitchen_kds" && (
              <div className="flex items-center gap-2">
                <a
                  href={`/pos?slug=${tenantSlug || "restaurant"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
                  title="Open Counter POS Terminal"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Open POS</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                </a>
                <a
                  href={`/kitchen?slug=${tenantSlug || "restaurant"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 transition-all"
                  title="Open Kitchen Display System"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Open KDS</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                </a>
                <a
                  href={`/rider?slug=${tenantSlug || "restaurant"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
                  title="Open Rider Delivery Portal"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Open Rider</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                </a>
              </div>
            )}

            {/* Auto-Poll Toggle for Orders */}
            {activeTab === "orders" && (
              <button
                type="button"
                onClick={() => setAutoPoll(!autoPoll)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  autoPoll
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                }`}
                title={autoPoll ? "Auto-refreshing every 10s" : "Auto-refresh paused"}
              >
                <Timer className={`w-3.5 h-3.5 ${autoPoll ? "text-amber-500 animate-spin" : ""}`} />
                <span className="hidden sm:inline">{autoPoll ? "Live 10s" : "Paused"}</span>
              </button>
            )}

            {/* Refresh Data Button */}
            <button
              type="button"
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              title={`Last refreshed at ${lastRefreshedAt.toLocaleTimeString()}`}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${refreshing ? "animate-spin" : ""}`} />
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

        {/* Toast Notification */}
        {statusToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
            <div className={`p-4 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
              statusToast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20"
                : "bg-rose-600 text-white border-rose-500 shadow-rose-600/20"
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusToast.msg}</span>
            </div>
          </div>
        )}

        {/* Executive KPI Stats Grid */}
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Active Orders */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Kitchen Orders</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeOrdersCount}</h3>
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    {receivedOrdersCount} New &bull; {activeOrdersCount - receivedOrdersCount} Cooking
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ChefHat className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Today's Revenue */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Order Revenue</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                    Rs. {totalRevenueRs.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                  </h3>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {completedOrdersCount} Fulfilled
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <span className="text-base font-bold font-mono">Rs.</span>
              </div>
            </div>

            {/* Card 3: Menu Items */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Menu Catalog</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {menuItems.filter((m) => m.is_available).length}
                  </h3>
                  <span className="text-[11px] font-medium text-slate-500">
                    in {categoriesList.length || availableCategories.length - 1} Categories
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Table Reservations */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Dining Floor Capacity</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tables.length}</h3>
                  <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">
                    {tables.reduce((acc, t) => acc + (t.capacity || 0), 0)} Seats ({reservations.length} Booked)
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <LayoutGrid className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ==================== TAB 1: ORDERS REVIEW & MANAGEMENT ==================== */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by Order #, Customer Name, Phone, or Dish..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => setOrderSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Order Type Filter */}
                  <select
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Order Types</option>
                    <option value="delivery">Delivery (🚚)</option>
                    <option value="pickup">Pickup (🛍️)</option>
                    <option value="dine_in">Dine-in (🍽️)</option>
                  </select>

                  {/* Status Filter Pills */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs overflow-x-auto">
                    {[
                      { id: "all", label: `All (${orders.length})` },
                      { id: "received", label: `Received (${receivedOrdersCount})` },
                      { id: "in_kitchen", label: `In Kitchen (${orders.filter((o) => o.status === "in_kitchen").length})` },
                      { id: "ready", label: `Ready (${readyOrdersCount})` },
                      { id: "completed", label: `Completed (${completedOrdersCount})` },
                      { id: "cancelled", label: `Cancelled` },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setOrderStatusFilter(st.id)}
                        className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                          orderStatusFilter === st.id
                            ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Orders POS Table */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                  <p className="text-xs">Loading orders feed...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No orders found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {orderSearch || orderStatusFilter !== "all" || orderTypeFilter !== "all"
                      ? "No orders match your filter criteria. Try clearing filters."
                      : "New orders received via WhatsApp or online widget will appear here in real-time."}
                  </p>
                  {(orderSearch || orderStatusFilter !== "all" || orderTypeFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderSearch("");
                        setOrderStatusFilter("all");
                        setOrderTypeFilter("all");
                      }}
                      className="text-xs font-semibold text-amber-600 hover:underline"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">Order # &amp; Type</th>
                          <th className="p-4">Customer Details</th>
                          <th className="p-4">Items &amp; Customizations</th>
                          <th className="p-4">Total (Rs.)</th>
                          <th className="p-4">Status &amp; Update</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredOrders.map((order) => {
                          const isReceived = order.status === "received";
                          const isInKitchen = order.status === "in_kitchen";
                          const isReady = order.status === "ready";
                          const isCompleted = order.status === "completed";
                          const isCancelled = order.status === "cancelled";
                          const isUpdating = updatingOrderId === order.id;

                          return (
                            <tr
                              key={order.id}
                              className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                                isReceived ? "bg-amber-50/30 dark:bg-amber-950/20" : ""
                              }`}
                            >
                              {/* Column 1: Order # & Type */}
                              <td className="p-4 align-top">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                                      {order.order_number || `#${order.id.slice(0, 6).toUpperCase()}`}
                                    </span>
                                    {isReceived && (
                                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                    )}
                                  </div>
                                  <div>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                        order.order_type === "delivery"
                                          ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                          : order.order_type === "pickup"
                                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                          : "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
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
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {order.created_at
                                      ? new Date(order.created_at).toLocaleString([], {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "Recent"}
                                  </p>
                                </div>
                              </td>

                              {/* Column 2: Customer */}
                              <td className="p-4 align-top">
                                <div className="space-y-1 max-w-[200px]">
                                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {order.customer_name || "Guest Customer"}
                                  </p>
                                  {order.customer_phone && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <a
                                        href={`tel:${order.customer_phone}`}
                                        className="font-mono hover:text-amber-600 transition-colors"
                                      >
                                        {order.customer_phone}
                                      </a>
                                    </div>
                                  )}
                                  {order.delivery_address && (
                                    <div className="flex items-start gap-1 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                      <span className="line-clamp-2">{order.delivery_address}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Column 3: Items Breakdown */}
                              <td className="p-4 align-top">
                                <div className="space-y-1.5 max-w-xs">
                                  {(order.items || []).map((it, idx) => (
                                    <div key={idx} className="space-y-0.5">
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold text-[10px] font-mono">
                                          {it.quantity}x
                                        </span>
                                        <span>{it.name}</span>
                                        {it.variant && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                            {it.variant}
                                          </span>
                                        )}
                                      </div>

                                      {/* Add-ons list if any */}
                                      {it.addons && it.addons.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pl-6">
                                          {it.addons.map((ad, aIdx) => (
                                            <span
                                              key={aIdx}
                                              className="text-[10px] px-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium"
                                            >
                                              + {ad}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {it.notes && (
                                        <p className="text-[10px] italic text-slate-400 pl-6">
                                          Note: {it.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}

                                  {(order.special_instructions || (order as any).notes) && (
                                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-amber-600 dark:text-amber-400 italic">
                                      Special: "{order.special_instructions || (order as any).notes}"
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Column 4: Total Amount in Rs. */}
                              <td className="p-4 align-top">
                                <div className="space-y-0.5">
                                  <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                                    Rs. {(Number(order.total_amount) || 0).toLocaleString("en-PK", { minimumFractionDigits: 0 })}
                                  </span>
                                  <p className="text-[10px] text-slate-400">Cash on Delivery / Direct</p>
                                </div>
                              </td>

                              {/* Column 5: Status Badge & Update Selector */}
                              <td className="p-4 align-top">
                                <div className="space-y-2">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      isReceived
                                        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                        : isInKitchen
                                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                        : isReady
                                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                        : isCompleted
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                                    }`}
                                  >
                                    {isUpdating ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                    )}
                                    <span>{isUpdating ? "Updating..." : order.status.replace("_", " ")}</span>
                                  </span>

                                  {/* Direct Status Selector */}
                                  <div>
                                    <select
                                      disabled={isUpdating}
                                      value={order.status}
                                      onChange={(e) =>
                                        handleUpdateOrderStatus(
                                          order,
                                          e.target.value as "received" | "in_kitchen" | "ready" | "completed" | "cancelled"
                                        )
                                      }
                                      className="w-full text-[11px] font-semibold py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                                    >
                                      <option value="received">Received (New)</option>
                                      <option value="in_kitchen">In Kitchen (Cooking)</option>
                                      <option value="ready">Ready for Pickup / Delivery</option>
                                      <option value="completed">Completed &amp; Delivered</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                </div>
                              </td>

                              {/* Column 6: Actions */}
                              <td className="p-4 align-top text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View / Print Receipt */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptOrder(order)}
                                    title="View / Print Order Receipt"
                                    className="p-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Receipt</span>
                                  </button>

                                  {/* Direct WhatsApp Contact */}
                                  {order.customer_phone && (
                                    <a
                                      href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
                                      title="WhatsApp Customer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
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

          {/* ==================== TAB 2: MENU & CATEGORIES (POS CATALOG) ==================== */}
          {activeTab === "menu" && (
            <div className="space-y-5">
              {/* Top View Toggle Buttons: Items (Default) vs Category */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMenuSubView("items")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      menuSubView === "items"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Dishes &amp; Items ({menuItems.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuSubView("categories")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      menuSubView === "categories"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Categories ({categoriesList.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 px-2">
                  {menuSubView === "items" ? (
                    <button
                      type="button"
                      onClick={openNewItemModal}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Dish</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Category</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SUB-VIEW 1: ITEMS TABLE (POS STYLE) */}
              {menuSubView === "items" && (
                <div className="space-y-4">
                  {/* Search and Category Filter Pills */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        placeholder="Search dishes by name or ingredients..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                      {availableCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMenuCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            menuCategoryFilter === cat
                              ? "bg-amber-500 text-white shadow-xs font-bold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Items POS Table */}
                  {filteredMenuItems.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No dishes found</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {menuSearch || menuCategoryFilter !== "All"
                          ? "No menu dishes match your search or filter."
                          : "Start building your restaurant catalog with dishes, prices in Rs., variants, and add-ons."}
                      </p>
                      <button
                        type="button"
                        onClick={openNewItemModal}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Dish</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="p-4">Dish Name &amp; Info</th>
                              <th className="p-4">Category</th>
                              <th className="p-4">Base Price (Rs.)</th>
                              <th className="p-4">Variants / Sizes</th>
                              <th className="p-4">Add-ons</th>
                              <th className="p-4">Stock Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {filteredMenuItems.map((item) => (
                              <tr
                                key={item.id}
                                className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                                  !item.is_available ? "opacity-60" : ""
                                }`}
                              >
                                {/* Name & Description */}
                                <td className="p-4 align-top">
                                  <div className="space-y-0.5 max-w-xs">
                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                      {item.name}
                                    </p>
                                    {item.description && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </td>

                                {/* Category */}
                                <td className="p-4 align-top">
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                    {item.category || "Mains"}
                                  </span>
                                </td>

                                {/* Base Price */}
                                <td className="p-4 align-top">
                                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                                    Rs. {Number(item.price).toLocaleString("en-PK", { minimumFractionDigits: 0 })}
                                  </span>
                                </td>

                                {/* Variants */}
                                <td className="p-4 align-top">
                                  {item.variants && item.variants.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                      {item.variants.map((v, vIdx) => (
                                        <span
                                          key={vIdx}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono"
                                        >
                                          <span>{v.name}:</span>
                                          <span className="text-amber-600 dark:text-amber-400 font-bold">Rs. {v.price}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px] italic">Standard (1 Size)</span>
                                  )}
                                </td>

                                {/* Add-ons */}
                                <td className="p-4 align-top">
                                  {item.addons && item.addons.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                      {item.addons.map((a, aIdx) => (
                                        <span
                                          key={aIdx}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono"
                                        >
                                          <span>{a.name}</span>
                                          <span className="font-bold">+Rs. {a.price}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px] italic">None</span>
                                  )}
                                </td>

                                {/* Stock Switch */}
                                <td className="p-4 align-top">
                                  <button
                                    type="button"
                                    disabled={togglingItemId === item.id}
                                    onClick={() => handleToggleMenuAvailability(item)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                                      item.is_available
                                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                    }`}
                                  >
                                    {togglingItemId === item.id ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <span className={`w-2 h-2 rounded-full ${item.is_available ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                                    )}
                                    <span>
                                      {togglingItemId === item.id
                                        ? "Updating..."
                                        : item.is_available
                                        ? "In Stock"
                                        : "Sold Out"}
                                    </span>
                                  </button>
                                </td>

                                {/* Actions */}
                                <td className="p-4 align-top text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditItemModal(item)}
                                      title="Edit Dish"
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingItemId === item.id}
                                      onClick={() => handleDeleteMenuItem(item)}
                                      title="Delete Dish"
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                                    >
                                      {deletingItemId === item.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 2: CATEGORIES TABLE */}
              {menuSubView === "categories" && (
                <div className="space-y-4">
                  {categoriesList.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No categories created</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Create menu categories (e.g. Burgers, Steaks, Drinks, Desserts) to organize your restaurant POS.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Category</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="p-4">Display Order</th>
                              <th className="p-4">Category Name</th>
                              <th className="p-4">Description</th>
                              <th className="p-4">Menu Items Count</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {categoriesList.map((cat) => {
                              const itemCount = menuItems.filter(
                                (m) => m.category?.toLowerCase() === cat.name.toLowerCase()
                              ).length;

                              return (
                                <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="p-4 font-mono font-bold text-slate-500">
                                    #{cat.display_order}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                        {cat.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-slate-500 dark:text-slate-400">
                                    {cat.description || <span className="italic text-slate-400">—</span>}
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                                      {itemCount} Dishes
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <button
                                      type="button"
                                      disabled={deletingCategoryId === cat.id}
                                      onClick={() => handleDeleteCategory(cat)}
                                      title="Delete Category"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                                    >
                                      {deletingCategoryId === cat.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
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
            </div>
          )}

          {/* ==================== TAB 3: TABLE RESERVATIONS ==================== */}
          {activeTab === "reservations" && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={reservationSearch}
                      onChange={(e) => setReservationSearch(e.target.value)}
                      placeholder="Search guest name or phone..."
                      className="pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Date:</span>
                    <input
                      type="date"
                      value={reservationDateFilter}
                      onChange={(e) => setReservationDateFilter(e.target.value)}
                      className="py-1 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                    />
                    {reservationDateFilter && (
                      <button
                        type="button"
                        onClick={() => setReservationDateFilter("")}
                        className="text-xs text-amber-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Total Bookings: <span className="font-bold text-slate-900 dark:text-slate-100">{filteredReservations.length}</span>
                </div>
              </div>

              {filteredReservations.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No table bookings found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Table reservations booked via WhatsApp or telephone AI receptionist will appear here.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">Guest Name</th>
                          <th className="p-4">Contact Phone</th>
                          <th className="p-4">Party Size</th>
                          <th className="p-4">Reservation Date &amp; Time</th>
                          <th className="p-4">Assigned Table</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredReservations.map((res) => (
                          <tr key={res.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                              {res.customer_name}
                            </td>
                            <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                              {res.customer_phone}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Users className="w-3.5 h-3.5" />
                                <span>{res.party_size} Guests</span>
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{res.booking_date}</span>{" "}
                              &bull; {res.booking_time}
                            </td>
                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                              {(res as any).table_number ? `Table ${(res as any).table_number}` : "Reserved"}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {(res as any).status || "Confirmed"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <a
                                href={`https://wa.me/${res.customer_phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 inline-flex transition-colors"
                                title="Message on WhatsApp"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 4: DINING FLOOR TABLES ==================== */}
          {activeTab === "tables" && (
            <div className="space-y-4">
              {tables.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 border border-purple-200 dark:border-purple-800 flex items-center justify-center mx-auto">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No dining tables configured</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Set up your dining room floor tables so the AI system can intelligently book reservations according to party size.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddTableModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Configure First Table</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className="p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center space-y-2 hover:border-amber-400 transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono font-bold text-base flex items-center justify-center">
                        {table.table_number}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          Table {table.table_number}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {table.capacity} Person Capacity
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Available
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 5: STATION OPERATIONS & SCREEN HUB ==================== */}
          {activeTab === "kitchen_kds" && (
            <div className="max-w-5xl space-y-6">
              {/* Header Hero Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white border border-amber-800/40 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/40 shrink-0">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Station Operations &amp; Screen Hub</h2>
                      <p className="text-xs text-amber-200/80 mt-0.5">
                        Central control hub for all 3 operational screens: Counter POS Terminal, Kitchen Cook Line (KDS), and Rider Mobile App.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      3 Active Stations
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5">
                    <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-100">Counter POS Terminal</span>
                      <span className="text-[11px] text-slate-300">Fast orders, thermal print, pickups &amp; delivery</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5">
                    <Tv className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-100">Kitchen Display (KDS)</span>
                      <span className="text-[11px] text-slate-300">20m cook countdown, large TV touch tickets</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5">
                    <Bike className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-100">Rider Mobile App</span>
                      <span className="text-[11px] text-slate-300">Delivery fleet dispatch &amp; status updates</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Dedicated Operational Screen Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Counter POS Terminal Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Store className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Station 1 · Cashier
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Counter POS Terminal
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                        Touch order taking (pickup, delivery, dine-in), item variants &amp; addons, order editing, and 80mm thermal receipt printing.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                      <span className="truncate">{posTerminalUrl}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyScreenUrl("pos")}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 shrink-0 cursor-pointer"
                        title="Copy POS URL"
                      >
                        {copiedScreenUrl === "pos" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <a
                      href={posTerminalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-all"
                    >
                      <Store className="w-4 h-4" />
                      <span>Launch POS Screen</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                    </a>
                  </div>
                </div>

                {/* 2. Kitchen Display System (KDS) Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <Tv className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Station 2 · Cook Line
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Kitchen Display System (KDS)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                        Large TV touch ticket display with 20-minute countdown timers, color urgency, cook bump actions, and WhatsApp notifications.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                      <span className="truncate">{kitchenDisplayUrl}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyScreenUrl("kitchen")}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 shrink-0 cursor-pointer"
                        title="Copy KDS URL"
                      >
                        {copiedScreenUrl === "kitchen" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <a
                      href={kitchenDisplayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 shadow-xs transition-all"
                    >
                      <Tv className="w-4 h-4" />
                      <span>Launch KDS Screen</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                    </a>
                  </div>
                </div>

                {/* 3. Rider Delivery Portal Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                        <Bike className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        Station 3 · Fleet
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Rider Delivery App
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                        Mobile-first portal for dispatch riders. View orders ready for delivery, one-tap phone calls &amp; address navigation, update to Reached / Delivered.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                      <span className="truncate">{riderPortalUrl}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyScreenUrl("rider")}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 shrink-0 cursor-pointer"
                        title="Copy Rider URL"
                      >
                        {copiedScreenUrl === "rider" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <a
                      href={riderPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-2 shadow-xs transition-all"
                    >
                      <Bike className="w-4 h-4" />
                      <span>Launch Rider App</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                    </a>
                  </div>
                </div>
              </div>

              {/* ==================== SCREEN SECURITY PINS (GENERATE & CONFIGURE) ==================== */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-amber-500" />
                      <span>Station Screen Security PINs</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Each screen requires a 4-digit PIN to authenticate staff. Each screen defaults to <span className="font-mono font-bold text-slate-700 dark:text-slate-300">1234</span>. You can generate a random secure PIN for each screen or enter custom digits.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetAllPinsToDefault}
                      disabled={isUpdatingPin}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isUpdatingPin && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Reset All to 1234</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAllPins()}
                      disabled={isUpdatingPin}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingPin ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save All PINs</span>
                    </button>
                  </div>
                </div>

                {pinSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{pinSuccessMsg}</span>
                  </div>
                )}

                {/* 3 Dedicated PIN Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Counter POS PIN */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">POS Terminal PIN</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                        Default: 1234
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={8}
                          value={newPosPin}
                          onChange={(e) => setNewPosPin(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="1234"
                          className="w-full text-center text-lg font-mono font-bold tracking-widest px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => generateRandomPin("pos")}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Generate Random 4-Digit PIN"
                        >
                          <Dices className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                        <span>Active: <strong className="font-mono text-slate-800 dark:text-slate-200">{posPin}</strong></span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyPin(newPosPin, "pos")}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title="Copy PIN"
                          >
                            {copiedPinType === "pos" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveIndividualPin("pos")}
                            disabled={isUpdatingPin || newPosPin === posPin}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            {isUpdatingPin && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Kitchen Display PIN */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tv className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Kitchen KDS PIN</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                        Default: 1234
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={8}
                          value={newKitchenPin}
                          onChange={(e) => setNewKitchenPin(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="1234"
                          className="w-full text-center text-lg font-mono font-bold tracking-widest px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => generateRandomPin("kitchen")}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Generate Random 4-Digit PIN"
                        >
                          <Dices className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                        <span>Active: <strong className="font-mono text-slate-800 dark:text-slate-200">{kitchenPin}</strong></span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyPin(newKitchenPin, "kitchen")}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title="Copy PIN"
                          >
                            {copiedPinType === "kitchen" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveIndividualPin("kitchen")}
                            disabled={isUpdatingPin || newKitchenPin === kitchenPin}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            {isUpdatingPin && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Rider Mobile App PIN */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-cyan-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Rider App PIN</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600">
                        Default: 1234
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={8}
                          value={newRiderPin}
                          onChange={(e) => setNewRiderPin(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="1234"
                          className="w-full text-center text-lg font-mono font-bold tracking-widest px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={() => generateRandomPin("rider")}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Generate Random 4-Digit PIN"
                        >
                          <Dices className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                        <span>Active: <strong className="font-mono text-slate-800 dark:text-slate-200">{riderPin}</strong></span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyPin(newRiderPin, "rider")}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title="Copy PIN"
                          >
                            {copiedPinType === "rider" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveIndividualPin("rider")}
                            disabled={isUpdatingPin || newRiderPin === riderPin}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-40 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            {isUpdatingPin && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>
                    💡 <strong>Tip:</strong> Click the 🎲 dice icon next to any input to automatically generate a fresh 4-digit PIN for that screen.
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    Master PIN fallback is always enabled
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 6: WHATSAPP AI ==================== */}
          {activeTab === "whatsapp" && (
            <div className="max-w-4xl space-y-6">
              <WhatsAppConnectCard variant="restaurant" />
            </div>
          )}

          {/* ==================== TAB 7: WEB VOICE WIDGET ==================== */}
          {activeTab === "widget" && (
            <div className="max-w-4xl space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-amber-500" />
                    <span>Restaurant AI Receptionist Web Embed</span>
                  </h3>
                  <a
                    href={`/static/test_widget.html?token=${tenantToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Test Widget in Browser</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Copy and paste this script tag right before the closing <code className="text-amber-600 font-mono">&lt;/body&gt;</code> tag of your restaurant website.
                </p>

                <div className="relative">
                  <pre className="p-4 rounded-xl bg-slate-900 text-amber-300 font-mono text-xs overflow-x-auto border border-slate-800 select-all">
                    {widgetSnippet}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 8: SETTINGS & CHARGES & SECURITY ==================== */}
          {activeTab === "settings" && (
            <div className="max-w-3xl space-y-6">
              {/* Card 1: Restaurant Details & Surcharges */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-500" />
                    <span>Restaurant Profile & Surcharges</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Configure your restaurant name and optional delivery and service charges. These apply to receipts, POS orders, and AI receptionist quotes.
                  </p>
                </div>

                {settingsSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{settingsSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveRestaurantSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Restaurant Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      placeholder="e.g., Tiwana Restaurant"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Shown on customer receipts, station screens, and WhatsApp greetings.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Restaurant Slug (Station URL Key)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono select-all">
                        {tenantSlug || "restaurant"}
                      </div>
                      <span className="text-[11px] text-slate-400 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                        System Key
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Live station links (POS, Kitchen, Rider) use this slug identifier.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>Delivery Charges (Rs.)</span>
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Optional
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={settingsDeliveryCharges}
                        onChange={(e) => setSettingsDeliveryCharges(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Applied to Delivery orders. Leave 0 or blank for free delivery.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Service Charges (Rs.)</span>
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Optional
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={settingsServiceCharges}
                        onChange={(e) => setSettingsServiceCharges(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Applied as table / packaging service fee. Leave 0 or blank if none.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save Restaurant Settings</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 2: Change Portal Password */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>Change Portal Password</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Update your restaurant portal administrator password.
                  </p>
                </div>

                {changePasswordSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{changePasswordSuccess}</span>
                  </div>
                )}

                {changePasswordError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{changePasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={changePasswordCurrent}
                      onChange={(e) => setChangePasswordCurrent(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={changePasswordNew}
                      onChange={(e) => setChangePasswordNew(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={changePasswordConfirm}
                      onChange={(e) => setChangePasswordConfirm(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {changePasswordLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>Update Password</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================== MODAL: ADD / EDIT MENU ITEM (WITH VARIANTS & ADDONS) ==================== */}
      {isMenuItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingItemId ? "Edit Menu Dish" : "Add New Dish to Catalog"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveMenuItem} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Dish Name */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dish / Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  placeholder="e.g. Zinger Crunch Burger, Chicken Karahi, Garlic Bread"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Category & Base Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={isCustomCategory ? "__new__" : itemFormCategory}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setIsCustomCategory(true);
                        setNewCategoryInput("");
                        setItemFormCategory("");
                      } else {
                        setIsCustomCategory(false);
                        setItemFormCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                  >
                    <option value="" disabled>Select a Category...</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    {/* Fallback for pre-existing category not yet in categoriesList */}
                    {itemFormCategory &&
                      !isCustomCategory &&
                      !categoriesList.some((c) => c.name.toLowerCase() === itemFormCategory.toLowerCase()) && (
                        <option value={itemFormCategory}>{itemFormCategory}</option>
                    )}
                    <option value="__new__">＋ Create New Category...</option>
                  </select>

                  {/* If user selected new category, show clean input that auto-adds to categories */}
                  {isCustomCategory && (
                    <div className="mt-2 space-y-1 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          New Category Name:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCategory(false);
                            setItemFormCategory(categoriesList[0]?.name || "Mains");
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={newCategoryInput}
                        onChange={(e) => {
                          setNewCategoryInput(e.target.value);
                          setItemFormCategory(e.target.value);
                        }}
                        placeholder="e.g. Appetizers, BBQ Specials, Shakes"
                        className="w-full px-3.5 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      <p className="text-[10px] text-slate-400">Saved to Categories table automatically.</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Base Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={itemFormPrice}
                    onChange={(e) => setItemFormPrice(Number(e.target.value))}
                    className="w-full font-mono px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Ingredients (AI Agent Reads This)
                </label>
                <textarea
                  rows={2}
                  value={itemFormDescription}
                  onChange={(e) => setItemFormDescription(e.target.value)}
                  placeholder="Crispy double fried chicken breast fillet, spicy mayo, cheddar cheese..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* In Stock Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Available In Stock</p>
                  <p className="text-[11px] text-slate-500">Uncheck to mark as sold out</p>
                </div>
                <button
                  type="button"
                  onClick={() => setItemFormIsAvailable(!itemFormIsAvailable)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    itemFormIsAvailable
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {itemFormIsAvailable ? "In Stock" : "Sold Out"}
                </button>
              </div>

              {/* VARIANTS SECTION */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Item Variants / Sizes (Optional)</h4>
                    <p className="text-[11px] text-slate-500">
                      Configure sizes with specific prices in Rs. (e.g. Regular Rs. 450, Large Rs. 650)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Size/Variant</span>
                  </button>
                </div>

                {itemFormVariants.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No variants added (single standard size).</p>
                ) : (
                  <div className="space-y-2">
                    {itemFormVariants.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => handleUpdateVariantRow(idx, "name", e.target.value)}
                          placeholder="e.g. Regular / Large / Half / Full"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                        />
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-slate-400 text-xs">Rs.</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={v.price}
                            onChange={(e) => handleUpdateVariantRow(idx, "price", Number(e.target.value))}
                            className="w-24 font-mono px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ADD-ONS SECTION */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Add-ons &amp; Extras (Optional)</h4>
                    <p className="text-[11px] text-slate-500">
                      Add optional toppings/extras with extra price in Rs. (e.g. Extra Cheese +Rs. 80)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAddonRow}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Add-on</span>
                  </button>
                </div>

                {itemFormAddons.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No add-ons added.</p>
                ) : (
                  <div className="space-y-2">
                    {itemFormAddons.map((a, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={a.name}
                          onChange={(e) => handleUpdateAddonRow(idx, "name", e.target.value)}
                          placeholder="e.g. Extra Cheese / Garlic Mayo Dip"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                        />
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-slate-400 text-xs">+Rs.</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={a.price}
                            onChange={(e) => handleUpdateAddonRow(idx, "price", Number(e.target.value))}
                            className="w-24 font-mono px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAddonRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingItem}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingItem ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingItemId ? "Save Dish Changes" : "Create Dish in Menu"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD CATEGORY ==================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add Menu Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormName}
                  onChange={(e) => setCategoryFormName(e.target.value)}
                  placeholder="e.g. Burgers, Karahi, Starters, Drinks"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={categoryFormDescription}
                  onChange={(e) => setCategoryFormDescription(e.target.value)}
                  placeholder="e.g. Handcrafted gourmet burgers and wraps"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={categoryFormOrder}
                  onChange={(e) => setCategoryFormOrder(Number(e.target.value))}
                  className="w-full font-mono px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingCategory ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD TABLE ==================== */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add Dining Table</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Table Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. 1, 2B, VIP-1"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Seating Capacity (Guests) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(Number(e.target.value))}
                  className="w-full font-mono px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creatingTable}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creatingTable ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Table</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ORDER RECEIPT / INVOICE (PRINTABLE) ==================== */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header with Print & Close (Hidden on print) */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Order Invoice / Receipt</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptOrder(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Receipt Printable Paper Body with id="pos-thermal-receipt" for real 80mm print */}
            <div id="pos-thermal-receipt" className="p-6 overflow-y-auto space-y-4 text-xs font-mono select-all bg-white text-black">
              {/* Restaurant Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
                <h2 className="text-base font-bold tracking-tight text-black font-sans">
                  {tenantName}
                </h2>
                <p className="text-[10px] text-gray-600">Official Customer Order Receipt</p>
                <p className="text-[10px] text-gray-500">
                  {selectedReceiptOrder.created_at ? new Date(selectedReceiptOrder.created_at).toLocaleString() : ""}
                </p>
              </div>

              {/* Order Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block">Order ID:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedReceiptOrder.order_number || `#${selectedReceiptOrder.id.slice(0, 6).toUpperCase()}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Order Type:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 uppercase">
                    {selectedReceiptOrder.order_type}
                    {selectedReceiptOrder.table_number && ` (Table #${selectedReceiptOrder.table_number})`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Customer:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedReceiptOrder.customer_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedReceiptOrder.customer_phone}
                  </span>
                </div>
                {selectedReceiptOrder.delivery_address && (
                  <div className="col-span-2 pt-1">
                    <span className="text-slate-400 block">Delivery Address:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {selectedReceiptOrder.delivery_address}
                    </span>
                  </div>
                )}
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-2 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                  <span>Item &amp; Customization</span>
                  <span>Total</span>
                </div>

                {(selectedReceiptOrder.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {it.quantity}x {it.name}
                      </span>
                      {it.variant && (
                        <span className="text-slate-500 block text-[10px]">Size: {it.variant}</span>
                      )}
                      {it.addons && it.addons.length > 0 && (
                        <span className="text-emerald-600 block text-[10px]">
                          Add-ons: {it.addons.join(", ")}
                        </span>
                      )}
                      {it.notes && (
                        <span className="text-slate-400 italic block text-[10px]">"{it.notes}"</span>
                      )}
                      <span className="text-slate-400 block text-[10px]">@ Rs. {Number(it.price).toFixed(0)}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Rs. {(it.price * it.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bill Totals */}
              {(() => {
                const delFee = selectedReceiptOrder.order_type === "delivery" ? Number(settingsDeliveryCharges || 0) : 0;
                const svcFee = Number(settingsServiceCharges || 0);
                const itemsSubtotal = (selectedReceiptOrder.items || []).reduce(
                  (sum, it) => sum + (Number(it.price) * Number(it.quantity || 1)),
                  0
                );
                return (
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Items Subtotal:</span>
                      <span>Rs. {itemsSubtotal.toFixed(0)}</span>
                    </div>
                    {delFee > 0 && (
                      <div className="flex justify-between text-cyan-600 dark:text-cyan-400">
                        <span>Delivery Charges:</span>
                        <span>+ Rs. {delFee.toFixed(0)}</span>
                      </div>
                    )}
                    {svcFee > 0 && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400">
                        <span>Service Charges:</span>
                        <span>+ Rs. {svcFee.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span>Grand Total:</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        Rs. {(selectedReceiptOrder.total_amount || (itemsSubtotal + delFee + svcFee)).toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Special Instructions */}
              {(selectedReceiptOrder.special_instructions || (selectedReceiptOrder as any).notes) && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                  <strong>Kitchen Instructions:</strong>{" "}
                  {selectedReceiptOrder.special_instructions || (selectedReceiptOrder as any).notes}
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-3 text-[10px] text-slate-400 space-y-0.5">
                <p>Thank you for choosing {tenantName}!</p>
                <p>Questions? Contact our team via WhatsApp.</p>
              </div>
            </div>
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
