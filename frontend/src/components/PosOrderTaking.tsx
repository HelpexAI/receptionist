"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Store,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Lock,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  X,
  Flame,
  PackageCheck,
  User,
  Phone,
  MapPin,
  FileText,
  Sparkles,
  Edit,
  Save,
  Check,
  ChefHat,
  Bike,
} from "lucide-react";
import {
  RestaurantOrder,
  MenuItem,
  MenuCategory,
  verifyKitchenPin,
  getPosMenu,
  createPosOrder,
  getPosOrders,
  updatePosOrderStatus,
  updatePosOrder,
} from "@/lib/api";
import ConfirmationModal from "./ConfirmationModal";
import KitchenDisplaySystem from "./KitchenDisplaySystem";
import RiderPortal from "./RiderPortal";

interface PosOrderTakingProps {
  initialSlug?: string;
}

export default function PosOrderTaking({ initialSlug }: PosOrderTakingProps) {
  // Authentication
  const [slug, setSlug] = useState<string>(initialSlug || "");
  const [pin, setPin] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [serviceCharges, setServiceCharges] = useState<number>(0);
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Active Screen: 'pos' (order taking) | 'orders' (all orders review) | 'kitchen' (KDS) | 'rider' (rider fleet)
  const [activeScreen, setActiveScreen] = useState<"pos" | "orders" | "kitchen" | "rider">("pos");

  // Menu Catalog State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Variant & Addon Customization Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{ name: string; price: number } | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Array<{ name: string; price: number }>>([]);
  const [customizationNotes, setCustomizationNotes] = useState<string>("");

  // Cart & Order Form State (DEFAULT IS PICKUP as requested)
  const [orderType, setOrderType] = useState<"pickup" | "delivery" | "dine_in">("pickup");
  const [tableNumber, setTableNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [cartItems, setCartItems] = useState<
    Array<{
      id: string;
      item_id?: string;
      name: string;
      variant?: string;
      addons?: string[];
      price: number;
      quantity: number;
      subtotal: number;
      notes?: string;
    }>
  >([]);
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);

  // Orders Review Screen State (NO AUTO-POLLING: only manual refresh or tab change)
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersRefreshing, setOrdersRefreshing] = useState<boolean>(false);
  const [orderSearch, setOrderSearch] = useState<string>("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Edit Order Modal State
  const [editingOrder, setEditingOrder] = useState<RestaurantOrder | null>(null);
  const [editCustomerName, setEditCustomerName] = useState<string>("");
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>("");
  const [editOrderType, setEditOrderType] = useState<"pickup" | "delivery" | "dine_in">("pickup");
  const [editTableNumber, setEditTableNumber] = useState<string>("");
  const [editDeliveryAddress, setEditDeliveryAddress] = useState<string>("");
  const [editSpecialInstructions, setEditSpecialInstructions] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("received");
  const [editItems, setEditItems] = useState<
    Array<{
      item_id?: string;
      name: string;
      variant?: string;
      addons?: string[];
      price: number;
      quantity: number;
      subtotal: number;
      notes?: string;
    }>
  >([]);
  const [selectedAddDishId, setSelectedAddDishId] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Thermal Receipt Modal State
  const [receiptOrder, setReceiptOrder] = useState<RestaurantOrder | null>(null);
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

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>("");

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

  // Initialize slug and stored credentials
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const qSlug = urlParams.get("slug");
      const storedSlug = sessionStorage.getItem("pos_slug");
      const storedPin = sessionStorage.getItem("pos_pin");

      const resolvedSlug = qSlug || initialSlug || storedSlug || "";
      if (resolvedSlug) {
        setSlug(resolvedSlug);
      }
      if (resolvedSlug && storedPin) {
        setPin(storedPin);
        verifyPinAndLoad(resolvedSlug, storedPin);
      }
    }
  }, [initialSlug]);

  const verifyPinAndLoad = async (targetSlug: string, targetPin: string) => {
    setVerifyingPin(true);
    setPinError(null);
    try {
      const res = await verifyKitchenPin(targetPin, targetSlug, "pos");
      if (res.success) {
        setIsAuthenticated(true);
        setRestaurantName(res.business_name || targetSlug);
        setDeliveryCharges(res.delivery_charges ?? 0);
        setServiceCharges(res.service_charges ?? 0);
        sessionStorage.setItem("pos_slug", targetSlug);
        sessionStorage.setItem("pos_pin", targetPin);
        await Promise.all([
          loadPosMenuData(targetSlug, targetPin),
          loadPosOrdersData(targetSlug, targetPin, true),
        ]);
      }
    } catch (err: any) {
      setPinError(err?.message || "Invalid PIN. Please check your credentials.");
      setIsAuthenticated(false);
    } finally {
      setVerifyingPin(false);
    }
  };

  const loadPosMenuData = async (targetSlug: string, targetPin: string) => {
    setCatalogLoading(true);
    try {
      const data = await getPosMenu(targetSlug, targetPin);
      setMenuItems(data.items || []);
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Failed to load POS menu:", err);
    } finally {
      setCatalogLoading(false);
    }
  };

  // Only loads when manually called (Tab Switch or Refresh Button clicked) - NO INTERVAL LOOP
  const loadPosOrdersData = async (targetSlug: string, targetPin: string, isInitial = false) => {
    if (isInitial || orders.length === 0) {
      setOrdersLoading(true);
    } else {
      setOrdersRefreshing(true);
    }
    try {
      const ords = await getPosOrders(targetSlug, targetPin);
      setOrders(ords);
    } catch (err) {
      console.error("Failed to load POS orders:", err);
    } finally {
      setOrdersLoading(false);
      setOrdersRefreshing(false);
    }
  };

  // Catalog item click handler (Instant Select / Deselect for Touch Tablet)
  const handleItemClick = (item: MenuItem) => {
    // Check if this item is currently in the cart
    const isSelected = cartItems.some(
      (c) => (c.item_id && c.item_id === item.id) || c.name.toLowerCase() === item.name.toLowerCase()
    );

    if (isSelected) {
      // Tap again: Deselect & remove from cart instantly
      setCartItems((prev) =>
        prev.filter(
          (c) => !((c.item_id && c.item_id === item.id) || c.name.toLowerCase() === item.name.toLowerCase())
        )
      );
      if (customizingItem?.id === item.id) {
        setCustomizingItem(null);
      }
      return;
    }

    // Not selected yet: Select and add to cart
    const hasVariants = item.variants && item.variants.length > 0;
    const hasAddons = item.addons && item.addons.length > 0;

    if (hasVariants || hasAddons) {
      setCustomizingItem(item);
      if (hasVariants && item.variants) {
        setSelectedVariant(item.variants[0]);
      } else {
        setSelectedVariant(null);
      }
      setSelectedAddons([]);
      setCustomizationNotes("");
    } else {
      // Simple item directly added to cart (instant touch select)
      addItemToCart(item.name, item.price, item.id);
    }
  };

  const addItemToCart = (
    name: string,
    unitPrice: number,
    itemId?: string,
    variantName?: string,
    addonsList?: string[],
    notes?: string
  ) => {
    const cartItemId = `${name}-${variantName || ""}-${(addonsList || []).sort().join(",")}`;
    setCartItems((prev) => {
      const existing = prev.find((it) => it.id === cartItemId);
      if (existing) {
        return prev.map((it) =>
          it.id === cartItemId
            ? {
                ...it,
                quantity: it.quantity + 1,
                subtotal: (it.quantity + 1) * it.price,
              }
            : it
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          item_id: itemId,
          name,
          variant: variantName,
          addons: addonsList,
          price: unitPrice,
          quantity: 1,
          subtotal: unitPrice,
          notes,
        },
      ];
    });
  };

  // Confirm Customization Modal
  const handleConfirmCustomization = () => {
    if (!customizingItem) return;
    const basePrice = selectedVariant ? Number(selectedVariant.price) : Number(customizingItem.price);
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price), 0);
    const finalUnitPrice = basePrice + addonsTotal;

    addItemToCart(
      customizingItem.name,
      finalUnitPrice,
      customizingItem.id,
      selectedVariant ? selectedVariant.name : undefined,
      selectedAddons.map((a) => a.name),
      customizationNotes || undefined
    );

    setCustomizingItem(null);
  };

  const updateCartQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const newQty = it.quantity + delta;
            return {
              ...it,
              quantity: newQty,
              subtotal: newQty * it.price,
            };
          }
          return it;
        })
        .filter((it) => it.quantity > 0)
    );
  };

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.subtotal, 0);
  }, [cartItems]);

  const effectiveDeliveryFee = useMemo(() => {
    return orderType === "delivery" ? Number(deliveryCharges || 0) : 0;
  }, [orderType, deliveryCharges]);

  const effectiveServiceFee = useMemo(() => {
    return Number(serviceCharges || 0);
  }, [serviceCharges]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + effectiveDeliveryFee + effectiveServiceFee;
  }, [cartSubtotal, effectiveDeliveryFee, effectiveServiceFee]);

  // Submit Order via POS API (with confirmation modal)
  const promptSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showToast("Cart is empty. Please select dishes from the menu.", "error");
      return;
    }
    if (!customerName.trim()) {
      showToast("Please enter customer name.", "error");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      showToast("Please enter delivery address for delivery order.", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Confirm Order Placement",
      message: `Place this ${orderType.toUpperCase()} order for ${customerName.trim()}?`,
      details: (
        <div className="space-y-2 font-mono">
          <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-700">
            <span className="font-bold text-white uppercase">
              {orderType} {orderType === "dine_in" && tableNumber ? `(Table #${tableNumber})` : ""}
            </span>
            <span className="font-black text-emerald-400">
              Rs. {cartTotal.toLocaleString()}
            </span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-slate-300 pr-1">
            {cartItems.map((c, i) => (
              <div key={i} className="flex justify-between items-start">
                <span className="truncate pr-2">
                  {c.quantity}x {c.name} {c.variant ? `(${c.variant})` : ""}
                </span>
                <span className="text-slate-400 whitespace-nowrap">Rs. {c.subtotal.toFixed(0)}</span>
              </div>
            ))}
          </div>
          {(effectiveDeliveryFee > 0 || effectiveServiceFee > 0) && (
            <div className="pt-1 border-t border-slate-800 text-[11px] space-y-0.5 text-slate-400">
              {effectiveDeliveryFee > 0 && (
                <div className="flex justify-between text-cyan-400">
                  <span>Delivery Charges:</span>
                  <span>+ Rs. {effectiveDeliveryFee.toLocaleString()}</span>
                </div>
              )}
              {effectiveServiceFee > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Service Charges:</span>
                  <span>+ Rs. {effectiveServiceFee.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
          {customerPhone.trim() && (
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              Customer Phone: <span className="text-slate-200">{customerPhone}</span>
            </p>
          )}
        </div>
      ),
      confirmLabel: `Submit Order (Rs. ${cartTotal.toLocaleString()})`,
      variant: "emerald",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        setSubmittingOrder(true);
        try {
          const payload = {
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim() || "+923000000000",
            order_type: orderType,
            table_number: orderType === "dine_in" && tableNumber.trim() ? tableNumber.trim() : undefined,
            delivery_address: orderType === "delivery" ? deliveryAddress.trim() : undefined,
            items: cartItems.map((c) => ({
              item_id: c.item_id,
              name: c.name,
              variant: c.variant,
              addons: c.addons,
              price: c.price,
              quantity: c.quantity,
              subtotal: c.subtotal,
              notes: c.notes,
            })),
            special_instructions: specialInstructions.trim() || undefined,
          };

          const created = await createPosOrder(slug, pin, payload);
          setReceiptOrder(created);
          setOrders((prev) => [created, ...prev]);
          showToast(`Order #${created.order_number || "PUNCHED"} placed!`);

          // Reset cart and form
          setCartItems([]);
          setCustomerName("");
          setCustomerPhone("");
          setTableNumber("");
          setDeliveryAddress("");
          setSpecialInstructions("");
          setOrderType("pickup");
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          showToast(err?.message || "Failed to create order", "error");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setSubmittingOrder(false);
        }
      },
    });
  };

  // Clear Cart confirmation modal
  const promptClearCart = () => {
    if (cartItems.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Clear Entire Cart?",
      message: `Are you sure you want to remove all ${cartItems.length} selected dishes from the cart?`,
      confirmLabel: "Yes, Clear Cart",
      variant: "danger",
      onConfirm: () => {
        setCartItems([]);
        showToast("Cart cleared");
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Quick Status Update from All Orders Review Screen (with confirmation)
  const promptUpdateOrderStatus = (order: RestaurantOrder, newStatus: any) => {
    setConfirmModal({
      isOpen: true,
      title: `Update Order #${order.order_number}?`,
      message: `Advance order status from "${order.status}" to "${newStatus.replace("_", " ").toUpperCase()}"? WhatsApp customer alert will be dispatched automatically.`,
      confirmLabel: `Update to ${newStatus.replace("_", " ").toUpperCase()}`,
      variant: newStatus === "cancelled" ? "danger" : "primary",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        setUpdatingOrderId(order.id);
        try {
          const updated = await updatePosOrderStatus(order.id, slug, pin, newStatus);
          setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
          showToast(`Order #${order.order_number} marked as ${newStatus.replace("_", " ")}!`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          showToast(err?.message || "Failed to update order status", "error");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setUpdatingOrderId(null);
        }
      },
    });
  };

  // Open Edit Order Modal
  const handleOpenEditModal = (order: RestaurantOrder) => {
    setEditingOrder(order);
    setEditCustomerName(order.customer_name || "");
    setEditCustomerPhone(order.customer_phone || "");
    setEditOrderType(order.order_type || "pickup");
    setEditTableNumber(order.table_number || "");
    setEditDeliveryAddress(order.delivery_address || "");
    setEditSpecialInstructions(order.special_instructions || "");
    setEditStatus(order.status || "received");
    setEditItems(
      (order.items || []).map((it: any) => ({
        item_id: it.item_id,
        name: it.name,
        variant: it.variant,
        addons: it.addons,
        price: Number(it.price || 0),
        quantity: Number(it.quantity || 1),
        subtotal: Number(it.subtotal || (Number(it.price || 0) * Number(it.quantity || 1))),
        notes: it.notes,
      }))
    );
    setSelectedAddDishId("");
  };

  // Edit item quantity in Edit modal
  const handleUpdateEditItemQty = (index: number, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((it, idx) => {
          if (idx === index) {
            const newQty = Math.max(1, it.quantity + delta);
            return {
              ...it,
              quantity: newQty,
              subtotal: newQty * it.price,
            };
          }
          return it;
        })
    );
  };

  // Remove item from Edit modal
  const handleRemoveEditItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add extra dish to edited order
  const handleAddDishToEdit = () => {
    if (!selectedAddDishId) return;
    const dish = menuItems.find((m) => m.id === selectedAddDishId);
    if (!dish) return;
    setEditItems((prev) => [
      ...prev,
      {
        item_id: dish.id,
        name: dish.name,
        price: Number(dish.price),
        quantity: 1,
        subtotal: Number(dish.price),
      },
    ]);
    setSelectedAddDishId("");
  };

  // Recalculated total for edited order
  const editOrderTotal = useMemo(() => {
    return editItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  }, [editItems]);

  // Save Edit Order Changes
  const handleSaveOrderChanges = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      showToast("Order must contain at least one item.", "error");
      return;
    }
    if (!editCustomerName.trim()) {
      showToast("Please provide customer name.", "error");
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        customer_name: editCustomerName.trim(),
        customer_phone: editCustomerPhone.trim(),
        order_type: editOrderType,
        table_number: editOrderType === "dine_in" && editTableNumber.trim() ? editTableNumber.trim() : "",
        delivery_address: editOrderType === "delivery" ? editDeliveryAddress.trim() : "",
        special_instructions: editSpecialInstructions.trim(),
        status: editStatus,
        items: editItems.map((it) => ({
          item_id: it.item_id,
          name: it.name,
          variant: it.variant,
          addons: it.addons,
          price: it.price,
          quantity: it.quantity,
          subtotal: it.price * it.quantity,
          notes: it.notes,
        })),
      };

      const updated = await updatePosOrder(editingOrder.id, slug, pin, payload);
      setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? updated : o)));
      setEditingOrder(null);
      showToast(`Order #${updated.order_number || editingOrder.id.slice(0, 6)} updated!`);
    } catch (err: any) {
      showToast(err?.message || "Failed to save order changes", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((it) => {
      const matchesCat =
        selectedCategory === "all" ||
        it.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Filtered Orders Review
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesType =
        orderTypeFilter === "all" || o.order_type === orderTypeFilter;
      const matchesStatus =
        orderStatusFilter === "all" || o.status === orderStatusFilter;
      const matchesQuery =
        !orderSearch.trim() ||
        o.order_number.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customer_phone.includes(orderSearch);
      return matchesType && matchesStatus && matchesQuery;
    });
  }, [orders, orderTypeFilter, orderStatusFilter, orderSearch]);

  const promptLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: "Lock POS Terminal?",
      message: "Are you sure you want to lock the counter screen? Staff will need to re-enter the 4-digit POS PIN to access order taking.",
      confirmLabel: "Lock Terminal",
      variant: "warning",
      onConfirm: () => {
        setIsAuthenticated(false);
        setPin("");
        sessionStorage.removeItem("pos_pin");
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Trigger Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // ==================== SCREEN 1: PIN AUTHENTICATION ====================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070A10] text-white flex flex-col items-center justify-center p-4 selection:bg-amber-500">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0D121F] border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-black flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <Store className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white font-sans">
              POS Terminal &amp; Orders
            </h1>
            <p className="text-xs text-slate-400">
              Counter order taking &amp; live kitchen dispatch
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Restaurant Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="e.g. tiwana-restraunt"
              className="w-full px-4 py-3 rounded-xl bg-[#141A29] border border-slate-700/80 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

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
              className="w-full py-3 text-center text-2xl font-mono tracking-widest rounded-xl bg-[#141A29] border border-slate-700/80 text-amber-400 focus:border-amber-500 focus:outline-none"
            />
            {pinError && (
              <p className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={verifyingPin || pin.length < 4 || !slug.trim()}
            onClick={() => verifyPinAndLoad(slug, pin)}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
          >
            {verifyingPin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            <span>Unlock POS Terminal</span>
          </button>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 2: POS WORKSPACE ====================
  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans select-none selection:bg-amber-500">
      {/* ==================== POS TOP HEADER ==================== */}
      <header className="sticky top-0 z-40 bg-[#0E1424] border-b-2 border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl no-print">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black uppercase tracking-tight text-white font-mono">
                {restaurantName || slug}
              </h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-amber-500 text-black">
                POS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Counter Terminal &bull; {currentTime}
            </p>
          </div>
        </div>

        {/* Center: Screen Switcher ("New Order" vs "All Orders" vs "Kitchen" vs "Rider") */}
        <div className="flex items-center p-1 rounded-xl bg-[#141A29] border border-slate-800 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveScreen("pos")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black uppercase font-mono tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeScreen === "pos"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveScreen("orders");
              loadPosOrdersData(slug, pin);
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black uppercase font-mono tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeScreen === "orders"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Orders ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen("kitchen")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black uppercase font-mono tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeScreen === "kitchen"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Kitchen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen("rider")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black uppercase font-mono tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeScreen === "rider"
                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Rider</span>
          </button>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadPosMenuData(slug, pin);
              loadPosOrdersData(slug, pin);
            }}
            disabled={ordersRefreshing}
            className="p-2 rounded-xl bg-[#141A29] hover:bg-[#1C253B] border border-slate-700 text-slate-300 text-xs transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${ordersRefreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={promptLogout}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Lock POS"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==================== WORKSPACE 1: POS TERMINAL ==================== */}
      {activeScreen === "pos" ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden no-print">
          {/* LEFT: DISH CATALOG & CATEGORIES */}
          <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
            {/* Search & Category Filter Pills */}
            <div className="p-3 bg-[#0C101A] border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes by name..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141A28] border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider whitespace-nowrap transition-all ${
                    selectedCategory === "all"
                      ? "bg-amber-500 text-black font-black"
                      : "bg-[#141A28] text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  All Items ({menuItems.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider whitespace-nowrap transition-all ${
                      selectedCategory.toLowerCase() === cat.name.toLowerCase()
                        ? "bg-amber-500 text-black font-black"
                        : "bg-[#141A28] text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
              {catalogLoading ? (
                <div className="py-24 text-center text-slate-500 font-mono text-xs">
                  Loading menu catalog...
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="py-24 text-center text-slate-500 font-mono text-xs">
                  No dishes found matching your selection.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredMenuItems.map((item) => {
                    const hasVariants = item.variants && item.variants.length > 0;
                    const hasAddons = item.addons && item.addons.length > 0;
                    const isSelected = cartItems.some(
                      (c) => (c.item_id && c.item_id === item.id) || c.name.toLowerCase() === item.name.toLowerCase()
                    );
                    const quantityInCart = cartItems
                      .filter((c) => (c.item_id && c.item_id === item.id) || c.name.toLowerCase() === item.name.toLowerCase())
                      .reduce((sum, c) => sum + c.quantity, 0);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`p-3 rounded-2xl border shadow-md cursor-pointer transition-all duration-150 select-none flex flex-col justify-between group active:scale-[0.98] ${
                          isSelected
                            ? "bg-[#14233C] border-amber-500 ring-2 ring-amber-500/60 shadow-lg shadow-amber-500/10"
                            : "bg-[#0E1424] hover:bg-[#141D33] border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold font-mono text-amber-400 uppercase tracking-wider block truncate">
                              {item.category}
                            </span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>SELECTED{quantityInCart > 1 ? ` (${quantityInCart})` : ""}</span>
                              </span>
                            )}
                          </div>
                          <h4
                            className={`text-sm font-black transition-colors line-clamp-2 ${
                              isSelected ? "text-amber-200" : "text-white group-hover:text-amber-300"
                            }`}
                          >
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-sm font-black font-mono text-emerald-400">
                            Rs. {Number(item.price).toLocaleString()}
                          </span>

                          {isSelected ? (
                            <span className="text-[10px] font-bold text-rose-400 hover:text-rose-300 underline underline-offset-2">
                              Tap to remove
                            </span>
                          ) : (hasVariants || hasAddons) ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Options ▾
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-400">
                              Tap to add
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: CART & ORDER CHECKOUT (POS TERMINAL) */}
          <div className="w-full lg:w-96 xl:w-[420px] bg-[#0A0E1A] flex flex-col justify-between overflow-y-auto border-t lg:border-t-0 border-slate-800">
            {/* Header: Order Type Switcher (Default: Pickup) */}
            <div className="p-3 bg-[#0F1424] border-b border-slate-800 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Order Type (Default: Pickup)
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#141A29] border border-slate-800">
                <button
                  type="button"
                  onClick={() => setOrderType("pickup")}
                  className={`py-2 rounded-lg text-xs font-black uppercase font-mono tracking-wider flex items-center justify-center gap-1 transition-all ${
                    orderType === "pickup"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Pickup</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className={`py-2 rounded-lg text-xs font-black uppercase font-mono tracking-wider flex items-center justify-center gap-1 transition-all ${
                    orderType === "delivery"
                      ? "bg-purple-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType("dine_in")}
                  className={`py-2 rounded-lg text-xs font-black uppercase font-mono tracking-wider flex items-center justify-center gap-1 transition-all ${
                    orderType === "dine_in"
                      ? "bg-teal-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>Dine-In</span>
                </button>
              </div>
            </div>

            {/* Customer Inputs Form */}
            <div className="p-3 border-b border-slate-800 space-y-2 bg-[#0C101C]">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Bilal"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#141A28] border border-slate-700 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="03001234567"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#141A28] border border-slate-700 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {orderType === "dine_in" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <UtensilsCrossed className="w-3 h-3" />
                      <span>Table Number</span>
                    </span>
                    <span className="text-slate-400 text-[9px] lowercase font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. Table 4, T-12 (Optional)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#141A28] border border-slate-700 text-xs text-white focus:border-teal-500 focus:outline-none placeholder:text-slate-500 font-mono"
                  />
                </div>
              )}

              {orderType === "delivery" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>Delivery Address *</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House / Street / Area full address..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#141A28] border border-slate-700 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[160px]">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-1">
                <span>CART ITEMS ({cartItems.length})</span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={promptClearCart}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-mono">
                  No items added yet. Click dishes on the left to add to order.
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-[#111726] border border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5 flex-1">
                        <h5 className="text-xs font-bold text-white uppercase">{c.name}</h5>
                        {c.variant && (
                          <span className="text-[10px] text-amber-300 font-mono block">
                            Size: {c.variant}
                          </span>
                        )}
                        {c.addons && c.addons.length > 0 && (
                          <span className="text-[10px] text-emerald-300 font-mono block">
                            + {c.addons.join(", ")}
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-slate-300">
                          Rs. {Number(c.price).toFixed(0)} each
                        </span>
                      </div>

                      {/* Quantity & Subtotal */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs font-mono font-black text-emerald-400">
                          Rs. {c.subtotal.toFixed(0)}
                        </span>

                        <div className="flex items-center gap-1.5 bg-[#171E2E] rounded-lg p-0.5 border border-slate-700">
                          <button
                            type="button"
                            onClick={() => updateCartQty(c.id, -1)}
                            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold text-white px-1">
                            {c.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(c.id, 1)}
                            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Instructions & Bill Summary */}
            <div className="p-3 border-t-2 border-slate-800 bg-[#0E1424] space-y-2.5">
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Kitchen note (e.g. extra spicy, no onion)..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#141A28] border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />

              {/* Total Breakdown */}
              <div className="p-2.5 rounded-xl bg-[#141A29] border border-slate-700/80 space-y-1 font-mono">
                {(effectiveDeliveryFee > 0 || effectiveServiceFee > 0) && (
                  <div className="space-y-0.5 pb-1 border-b border-slate-800 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Items Subtotal:</span>
                      <span>Rs. {cartSubtotal.toLocaleString()}</span>
                    </div>
                    {effectiveDeliveryFee > 0 && (
                      <div className="flex justify-between text-cyan-400">
                        <span>Delivery Fee:</span>
                        <span>+ Rs. {effectiveDeliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                    {effectiveServiceFee > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Service Fee:</span>
                        <span>+ Rs. {effectiveServiceFee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-slate-300">Total Amount:</span>
                  <span className="text-lg font-black text-amber-400">
                    Rs. {cartTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Submit POS Order Button */}
              <button
                type="button"
                disabled={submittingOrder || cartItems.length === 0}
                onClick={promptSubmitOrder}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-black text-sm uppercase font-mono tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
              >
                {submittingOrder ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <span>SUBMIT ORDER (Rs. {cartTotal.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      ) : activeScreen === "orders" ? (
        /* ==================== WORKSPACE 2: ALL ORDERS & REVIEW ==================== */
        <div className="flex-1 p-4 sm:p-6 flex flex-col space-y-4 overflow-y-auto no-print">
          {/* Filters Bar */}
          <div className="p-3 rounded-2xl bg-[#0E1424] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by order #, customer, or phone..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#141A28] border border-slate-700/80 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white font-mono cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="dine_in">Dine-In</option>
            </select>

            {/* Status Filter */}
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white font-mono cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="received">Received / New</option>
              <option value="in_kitchen">In Kitchen / Cooking</option>
              <option value="ready">Ready</option>
              <option value="reached">Rider Reached</option>
              <option value="delivered">Delivered</option>
              <option value="picked_up">Picked Up</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Manual Refresh Button (NO AUTO-POLLING INTERVAL) */}
            <button
              type="button"
              disabled={ordersRefreshing}
              onClick={() => loadPosOrdersData(slug, pin)}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ordersRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh Orders</span>
            </button>
          </div>

          {/* Orders Table / Cards */}
          {ordersLoading ? (
            <div className="py-24 text-center text-slate-500 font-mono text-xs">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-24 text-center text-slate-500 font-mono text-xs">
              No orders found matching your filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isUpdating = updatingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-[#0E1424] border border-slate-800 shadow-md space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-white">
                          {order.order_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            order.order_type === "delivery"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : order.order_type === "pickup"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                          }`}
                        >
                          {order.order_type}
                          {order.table_number && ` • Table #${order.table_number}`}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Total, Edit Button, Print Receipt */}
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-emerald-400">
                          Rs. {Number(order.total_amount).toLocaleString()}
                        </span>

                        {/* EDIT ORDER BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(order)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Edit order items, customer, or details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* PRINT THERMAL RECEIPT BUTTON */}
                        <button
                          type="button"
                          onClick={() => setReceiptOrder(order)}
                          className="p-1.5 rounded-lg bg-[#141A28] hover:bg-[#1E273D] border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                          title="Print Thermal POS Receipt"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-200" />
                        </button>
                      </div>
                    </div>

                    {/* Customer & Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-white block">
                          {order.customer_name} &bull; {order.customer_phone}
                        </span>
                        {order.delivery_address && (
                          <p className="text-[11px] text-slate-400 mt-0.5 italic">
                            📍 {order.delivery_address}
                          </p>
                        )}
                        {order.special_instructions && (
                          <p className="text-[11px] text-amber-300 mt-0.5">
                            ⚡ {order.special_instructions}
                          </p>
                        )}
                      </div>

                      <div className="font-mono text-slate-300 space-y-0.5">
                        {(order.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              {it.quantity}x {it.name}
                              {it.variant && <span className="text-slate-400"> ({it.variant})</span>}
                            </span>
                            <span className="text-slate-400">
                              Rs. {Number(it.subtotal || it.price * it.quantity).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Inline Status Update Controls */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-mono">Current Status:</span>
                        <span className="px-2 py-0.5 rounded bg-[#141A28] border border-slate-700 text-amber-400 font-mono font-bold uppercase">
                          {order.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Status Change Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => promptUpdateOrderStatus(order, "in_kitchen")}
                          className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                        >
                          {isUpdating && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          <span>Cooking</span>
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => promptUpdateOrderStatus(order, "ready")}
                          className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                        >
                          {isUpdating && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          <span>Ready</span>
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => promptUpdateOrderStatus(order, "picked_up")}
                          className="px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                        >
                          {isUpdating && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          <span>Picked Up</span>
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => promptUpdateOrderStatus(order, "delivered")}
                          className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                        >
                          {isUpdating && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          <span>Delivered</span>
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => promptUpdateOrderStatus(order, "cancelled")}
                          className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                        >
                          {isUpdating && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeScreen === "kitchen" ? (
        /* ==================== WORKSPACE 3: KITCHEN DISPLAY SCREEN ==================== */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden no-print">
          <KitchenDisplaySystem initialSlug={slug} initialPin={pin} embedded={true} />
        </div>
      ) : (
        /* ==================== WORKSPACE 4: RIDER DELIVERY APP ==================== */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden no-print">
          <RiderPortal initialSlug={slug} initialPin={pin} embedded={true} />
        </div>
      )}

      {/* ==================== MODAL: VARIANT & ADDON SELECTOR ==================== */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-md rounded-3xl bg-[#0F1424] border border-slate-800 shadow-2xl overflow-hidden space-y-4 p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold font-mono text-amber-400 uppercase">
                  {customizingItem.category}
                </span>
                <h3 className="text-lg font-black text-white">{customizingItem.name}</h3>
                <p className="text-xs text-slate-400">{customizingItem.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Variants Radio Group */}
            {customizingItem.variants && customizingItem.variants.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Select Size / Variant
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.variants.map((v, idx) => {
                    const isSelected = selectedVariant?.name === v.name;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/20"
                            : "bg-[#141A28] border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="font-bold text-xs block">{v.name}</span>
                        <span className="text-xs font-mono font-black text-amber-400">
                          Rs. {Number(v.price).toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addons Checkbox Group */}
            {customizingItem.addons && customizingItem.addons.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Select Add-ons (Optional)
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {customizingItem.addons.map((addon, aIdx) => {
                    const isChecked = selectedAddons.some((a) => a.name === addon.name);
                    return (
                      <label
                        key={aIdx}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? "bg-emerald-500/10 border-emerald-500/60 text-white"
                            : "bg-[#141A28] border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAddons([...selectedAddons, addon]);
                              } else {
                                setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
                              }
                            }}
                            className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                          />
                          <span className="text-xs font-bold">{addon.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          + Rs. {Number(addon.price).toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customization Note */}
            <div className="space-y-1">
              <input
                type="text"
                value={customizationNotes}
                onChange={(e) => setCustomizationNotes(e.target.value)}
                placeholder="Specific item instructions (optional)..."
                className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Confirm Add to Cart */}
            <button
              type="button"
              onClick={handleConfirmCustomization}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
            >
              Add to Order (Rs.{" "}
              {(
                (selectedVariant ? Number(selectedVariant.price) : Number(customizingItem.price)) +
                selectedAddons.reduce((sum, a) => sum + Number(a.price), 0)
              ).toLocaleString()}
              )
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT ORDER DETAILS ==================== */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="w-full max-w-lg rounded-3xl bg-[#0D1322] border border-slate-800 shadow-2xl p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Edit Order #{editingOrder.order_number}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Fix mistake, update dishes, address, or customer details
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px]">Customer Name</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px]">Customer Phone</label>
                <input
                  type="text"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Order Type & Status Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px]">Order Type</label>
                <select
                  value={editOrderType}
                  onChange={(e) => setEditOrderType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white font-mono"
                >
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                  <option value="dine_in">Dine-In</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px]">Order Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white font-mono"
                >
                  <option value="received">Received / New</option>
                  <option value="in_kitchen">In Kitchen / Cooking</option>
                  <option value="ready">Ready</option>
                  <option value="reached">Reached Customer</option>
                  <option value="delivered">Delivered</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Delivery Address (if delivery) */}
            {editOrderType === "delivery" && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-purple-400 uppercase text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Delivery Address</span>
                </label>
                <textarea
                  rows={2}
                  value={editDeliveryAddress}
                  onChange={(e) => setEditDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}

            {/* Table Number (if dine-in) */}
            {editOrderType === "dine_in" && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-teal-400 uppercase text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <UtensilsCrossed className="w-3 h-3" />
                    <span>Table Number</span>
                  </span>
                  <span className="text-slate-400 text-[9px] lowercase font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)}
                  placeholder="e.g. Table 4, T-12 (Optional)"
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white focus:border-teal-500 focus:outline-none font-mono"
                />
              </div>
            )}

            {/* Ordered Items List & Quantity Adjusters */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="font-bold uppercase">ORDER ITEMS:</span>
                <span className="font-bold text-emerald-400">
                  Total: Rs. {editOrderTotal.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {editItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#131929] border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1">
                      <span className="font-bold text-white block">{item.name}</span>
                      {item.variant && (
                        <span className="text-[10px] text-amber-300 block">Size: {item.variant}</span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">
                        Rs. {Number(item.price).toFixed(0)} &times; {item.quantity} ={" "}
                        <strong className="text-emerald-400">
                          Rs. {(item.price * item.quantity).toFixed(0)}
                        </strong>
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 bg-[#171E2E] rounded-lg p-0.5 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleUpdateEditItemQty(idx, -1)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold text-white px-1">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateEditItemQty(idx, 1)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveEditItem(idx)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Extra Dish Selector */}
              <div className="pt-2 flex items-center gap-2">
                <select
                  value={selectedAddDishId}
                  onChange={(e) => setSelectedAddDishId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-xs text-white"
                >
                  <option value="">＋ Add another dish from menu...</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — Rs. {Number(m.price).toLocaleString()}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!selectedAddDishId}
                  onClick={handleAddDishToEdit}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase disabled:opacity-40 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Special Instructions Note */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-300 uppercase text-[10px]">
                Special Instructions
              </label>
              <input
                type="text"
                value={editSpecialInstructions}
                onChange={(e) => setEditSpecialInstructions(e.target.value)}
                placeholder="Kitchen note..."
                className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingEdit || editItems.length === 0}
                onClick={handleSaveOrderChanges}
                className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-40 cursor-pointer"
              >
                {savingEdit ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Changes (Rs. {editOrderTotal.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REAL RESTAURANT THERMAL PRINT RECEIPT ==================== */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-sm rounded-3xl bg-[#0D121F] border border-slate-800 shadow-2xl p-4 sm:p-5 space-y-4 my-auto">
            {/* Modal Header (Hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase font-mono text-white tracking-wider">
                  Real POS Thermal Receipt (80mm)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* REAL RESTAURANT THERMAL RECEIPT CONTAINER */}
            {/* Uses id="pos-thermal-receipt" matching @media print in globals.css */}
            <div
              id="pos-thermal-receipt"
              className="bg-white text-black p-4 rounded-xl font-mono text-xs space-y-2.5 shadow-xl border border-gray-200 select-text"
            >
              {/* Receipt Header */}
              <div className="text-center space-y-0.5">
                <h2 className="font-black text-base uppercase tracking-tight leading-none text-black">
                  {restaurantName || slug}
                </h2>
                <p className="text-[10px] text-gray-700 tracking-wider">
                  ORIGINAL ORDER RECEIPT / KOT
                </p>
                <p className="text-[10px] text-gray-700">
                  Tel: {receiptOrder.customer_phone}
                </p>
              </div>

              <div className="text-center text-[11px] font-bold text-gray-800">
                ----------------------------------------
              </div>

              {/* Order Meta */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-black text-xs">
                  <span>ORDER #{receiptOrder.order_number}</span>
                  <span className="uppercase font-bold px-1.5 py-0.2 rounded bg-black text-white">
                    {receiptOrder.order_type}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>DATE: {new Date(receiptOrder.created_at).toLocaleDateString()}</span>
                  <span>TIME: {new Date(receiptOrder.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="pt-0.5">
                  <span className="block"><strong>CUSTOMER:</strong> {receiptOrder.customer_name}</span>
                  <span className="block"><strong>PHONE:</strong> {receiptOrder.customer_phone}</span>
                  {receiptOrder.table_number && (
                    <span className="block leading-tight mt-0.5">
                      <strong>TABLE NUMBER:</strong> #{receiptOrder.table_number}
                    </span>
                  )}
                  {receiptOrder.delivery_address && (
                    <span className="block leading-tight mt-0.5">
                      <strong>ADDRESS:</strong> {receiptOrder.delivery_address}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center text-[11px] font-bold text-gray-800">
                ----------------------------------------
              </div>

              {/* Line Items Table */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between font-black text-[10px] uppercase text-gray-700 border-b border-gray-300 pb-0.5">
                  <span>QTY  ITEM</span>
                  <span>AMOUNT</span>
                </div>

                <div className="space-y-1.5">
                  {(receiptOrder.items || []).map((it, idx) => (
                    <div key={idx} className="space-y-0.2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold flex-1 pr-2">
                          {it.quantity}x {it.name}
                        </span>
                        <span className="font-bold whitespace-nowrap">
                          Rs. {Number(it.subtotal || it.price * it.quantity).toFixed(0)}
                        </span>
                      </div>
                      {it.variant && (
                        <div className="text-[10px] text-gray-600 pl-4">
                          Size: {it.variant}
                        </div>
                      )}
                      {it.addons && it.addons.length > 0 && (
                        <div className="text-[10px] text-gray-600 pl-4">
                          + {it.addons.join(", ")}
                        </div>
                      )}
                      {it.notes && (
                        <div className="text-[10px] text-gray-600 pl-4 italic">
                          * {it.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-[11px] font-bold text-gray-800">
                ----------------------------------------
              </div>

              {/* Totals & Net Amount */}
              {(() => {
                const delFee = receiptOrder.order_type === "delivery" ? Number(deliveryCharges || 0) : 0;
                const svcFee = Number(serviceCharges || 0);
                const itemsSubtotal = (receiptOrder.items || []).reduce(
                  (acc, it) => acc + Number(it.subtotal || it.price * it.quantity),
                  0
                );
                return (
                  <div className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between">
                      <span>ITEMS SUBTOTAL:</span>
                      <span>Rs. {itemsSubtotal.toFixed(2)}</span>
                    </div>
                    {delFee > 0 && (
                      <div className="flex justify-between">
                        <span>DELIVERY FEE:</span>
                        <span>Rs. {delFee.toFixed(2)}</span>
                      </div>
                    )}
                    {svcFee > 0 && (
                      <div className="flex justify-between">
                        <span>SERVICE FEE:</span>
                        <span>Rs. {svcFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-700">
                      <span>GST / TAX:</span>
                      <span>Rs. 0.00</span>
                    </div>
                    <div className="text-center text-[11px] font-bold text-gray-800">
                      ========================================
                    </div>
                    <div className="flex justify-between font-black text-sm pt-0.5">
                      <span>NET TOTAL:</span>
                      <span>Rs. {Number(receiptOrder.total_amount || (itemsSubtotal + delFee + svcFee)).toLocaleString()}</span>
                    </div>
                    <div className="text-center text-[11px] font-bold text-gray-800">
                      ========================================
                    </div>
                  </div>
                );
              })()}

              {/* Special Note */}
              {receiptOrder.special_instructions && (
                <div className="text-[10px] p-1.5 bg-gray-100 rounded border border-gray-300">
                  <strong>KITCHEN NOTE:</strong> "{receiptOrder.special_instructions}"
                </div>
              )}

              {/* Payment Mode & Footer */}
              <div className="text-center space-y-1 pt-1 text-[10px] text-gray-700">
                <p className="font-bold uppercase">
                  PAYMENT: {receiptOrder.order_type === "delivery" ? "CASH ON DELIVERY" : "COUNTER CASH"}
                </p>
                <p className="font-bold">*** THANK YOU FOR YOUR VISIT! ***</p>
                <p className="text-[9px] text-gray-500">
                  AI Business Management POS &bull; www.helpexai.com
                </p>
              </div>
            </div>

            {/* Modal Actions (Hidden on Print) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 no-print">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print 80mm Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

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
