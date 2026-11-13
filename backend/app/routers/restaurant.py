import logging
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db, SessionLocal
from app.models import Business, MenuItem, MenuCategory, RestaurantTable, RestaurantReservation, RestaurantOrder
from app.schemas import (
    MenuItemCreateRequest,
    MenuItemUpdateRequest,
    MenuItemUpdateAvailabilityRequest,
    MenuItemResponse,
    MenuCategoryCreateRequest,
    MenuCategoryResponse,
    KitchenPinUpdateRequest,
    KitchenVerifyRequest,
    ScreenPinsResponse,
    ScreenPinsUpdateRequest,
    RestaurantTableCreateRequest,
    RestaurantTableResponse,
    RestaurantReservationResponse,
    RestaurantOrderCreateRequest,
    RestaurantOrderUpdateRequest,
    RestaurantOrderStatusUpdateRequest,
    RiderOrderStatusUpdateRequest,
    RestaurantOrderResponse,
    RestaurantSettingsUpdateRequest,
    RestaurantSettingsResponse,
)
from app.deps import get_current_restaurant
from app.security import create_access_token
from app.services import waha_service, whatsapp_service

logger = logging.getLogger("restaurant_orders")

router = APIRouter(prefix="/api/restaurant", tags=["Restaurant Management"])

@router.post(
    "/menu",
    response_model=MenuItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a menu item to the restaurant"
)
def create_menu_item(
    payload: MenuItemCreateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    new_item = MenuItem(
        business_id=current_business.id,
        name=payload.name,
        category=payload.category,
        price=payload.price,
        is_available=payload.is_available,
        description=payload.description,
        variants=payload.variants or [],
        addons=payload.addons or []
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put(
    "/menu/{item_id}",
    response_model=MenuItemResponse,
    summary="Update full menu item details"
)
def update_menu_item(
    item_id: UUID,
    payload: MenuItemUpdateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.business_id == current_business.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    if payload.name is not None: item.name = payload.name
    if payload.category is not None: item.category = payload.category
    if payload.price is not None: item.price = payload.price
    if payload.is_available is not None: item.is_available = payload.is_available
    if payload.description is not None: item.description = payload.description
    if payload.variants is not None: item.variants = payload.variants
    if payload.addons is not None: item.addons = payload.addons
    db.commit()
    db.refresh(item)
    return item

@router.delete(
    "/menu/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a menu item"
)
def delete_menu_item(
    item_id: UUID,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.business_id == current_business.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    db.delete(item)
    db.commit()
    return None

@router.get(
    "/categories",
    response_model=List[MenuCategoryResponse],
    summary="List all menu categories"
)
def list_categories(
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    cats = (
        db.query(MenuCategory)
        .filter(MenuCategory.business_id == current_business.id)
        .order_by(MenuCategory.display_order.asc(), MenuCategory.name.asc())
        .all()
    )
    return cats

@router.post(
    "/categories",
    response_model=MenuCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a menu category"
)
def create_category(
    payload: MenuCategoryCreateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    existing = db.query(MenuCategory).filter(
        MenuCategory.business_id == current_business.id,
        MenuCategory.name.ilike(payload.name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    new_cat = MenuCategory(
        business_id=current_business.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        display_order=payload.display_order or 0
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a menu category"
)
def delete_category(
    category_id: UUID,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    cat = db.query(MenuCategory).filter(
        MenuCategory.id == category_id,
        MenuCategory.business_id == current_business.id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return None

@router.get(
    "/menu",
    response_model=List[MenuItemResponse],
    summary="List all menu items for the logged-in restaurant"
)
def list_menu_items(
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    items = (
        db.query(MenuItem)
        .filter(MenuItem.business_id == current_business.id)
        .order_by(MenuItem.category.asc(), MenuItem.name.asc())
        .all()
    )
    return items

@router.put(
    "/menu/{item_id}/availability",
    response_model=MenuItemResponse,
    summary="Toggle or set menu item availability"
)
def update_item_availability(
    item_id: UUID,
    payload: Optional[MenuItemUpdateAvailabilityRequest] = None,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    item = (
        db.query(MenuItem)
        .filter(
            MenuItem.id == item_id,
            MenuItem.business_id == current_business.id
        )
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item with ID '{item_id}' not found"
        )

    if payload and payload.is_available is not None:
        item.is_available = payload.is_available
    else:
        item.is_available = not item.is_available

    db.commit()
    db.refresh(item)
    return item

@router.post(
    "/tables",
    response_model=RestaurantTableResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a table to the restaurant"
)
def create_table(
    payload: RestaurantTableCreateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    existing = (
        db.query(RestaurantTable)
        .filter(
            RestaurantTable.business_id == current_business.id,
            RestaurantTable.table_number == payload.table_number
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Table '{payload.table_number}' already exists in this restaurant"
        )

    table = RestaurantTable(
        business_id=current_business.id,
        table_number=payload.table_number,
        capacity=payload.capacity
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return table

@router.get(
    "/tables",
    response_model=List[RestaurantTableResponse],
    summary="List all tables for the logged-in restaurant"
)
def list_tables(
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    tables = (
        db.query(RestaurantTable)
        .filter(RestaurantTable.business_id == current_business.id)
        .order_by(RestaurantTable.table_number.asc())
        .all()
    )
    return tables

@router.get(
    "/reservations",
    response_model=List[RestaurantReservationResponse],
    summary="List all reservations and food orders for this restaurant"
)
def list_reservations(
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    reservations = (
        db.query(RestaurantReservation)
        .filter(RestaurantReservation.business_id == current_business.id)
        .order_by(
            RestaurantReservation.booking_date.desc(),
            RestaurantReservation.booking_time.desc()
        )
        .all()
    )
    return reservations

# ==================== KITCHEN ORDER MANAGEMENT ====================

async def send_order_status_notification(order_id: UUID, new_status: str, business_id: UUID):
    """Sends proactive WhatsApp notification to the customer when the kitchen updates their order status."""
    db: Session = SessionLocal()
    try:
        order = db.query(RestaurantOrder).filter(
            RestaurantOrder.id == order_id,
            RestaurantOrder.business_id == business_id
        ).first()
        business = db.query(Business).filter(Business.id == business_id).first()
        if not order or not business:
            return

        status_messages = {
            "in_kitchen": (
                f"👨‍🍳 *Update from {business.name}*\n"
                f"Aapka order *#{order.order_number}* kitchen mein prepare ho raha hai!\n"
                f"⏱️ Estimated cooking time: 20 minutes\n"
                f"💰 Total: Rs. {float(order.total_amount):,.2f}\n"
                f"Jaise hi ready hoga, hum aapko notify karenge!"
            ),
            "preparing": (
                f"👨‍🍳 *Update from {business.name}*\n"
                f"Aapka order *#{order.order_number}* kitchen mein prepare ho raha hai!\n"
                f"⏱️ Estimated cooking time: 20 minutes\n"
                f"💰 Total: Rs. {float(order.total_amount):,.2f}\n"
                f"Jaise hi ready hoga, hum aapko notify karenge!"
            ),
            "ready": (
                f"🛵 *Update from {business.name}*\n"
                f"Good news! Aapka order *#{order.order_number}* bilkul fresh tayyar ho chuka hai"
                + (f" aur delivery ke liye ready hai (Address: {order.delivery_address})!" if order.order_type == "delivery" and order.delivery_address else " aur pickup ke liye counter par ready hai!")
            ),
            "out_for_delivery": (
                f"🛵 *Out for Delivery - {business.name}*\n"
                f"Aapka order *#{order.order_number}* rider ke pass hai aur aapki location ki taraf rawana ho chuka hai!"
            ),
            "reached": (
                f"📍 *Rider Reached - {business.name}*\n"
                f"Rider aapki location par pohanch gaya hai aapka order *#{order.order_number}* lekar.\n"
                f"Baraye meherbani rider se order receive kar lijiye!"
            ),
            "delivered": (
                f"🎉 *Order Delivered - {business.name}*\n"
                f"Aapka order *#{order.order_number}* deliver ho chuka hai.\n"
                f"Humare restaurant se order karne ka shukriya! Enjoy your meal! ⭐"
            ),
            "picked_up": (
                f"🎉 *Order Picked Up - {business.name}*\n"
                f"Aapka order *#{order.order_number}* pickup kar liya gaya hai.\n"
                f"Humare restaurant se order karne ka shukriya! Enjoy your meal! ⭐"
            ),
            "completed": (
                f"🎉 *Order Completed - {business.name}*\n"
                f"Aapka order *#{order.order_number}* complete ho chuka hai.\n"
                f"Humare restaurant se order karne ka shukriya! Enjoy your meal! ⭐"
            ),
            "cancelled": (
                f"⚠️ *Order Update - {business.name}*\n"
                f"Aapka order *#{order.order_number}* cancel kiya gaya hai.\n"
                f"Kisi bhi sawal ke liye aap humse rabta kar sakte hain."
            )
        }

        msg = status_messages.get(new_status)
        if not msg:
            return

        customer_phone = (order.customer_phone or "").strip()

        # Determine target WhatsApp Chat IDs (ongoing chat thread and customer phone)
        targets_to_try = []
        clean_num = None
        phone_chat_id = None

        # 1. Target candidate: chat from which the customer placed the order (preserves ongoing WhatsApp thread)
        order_chat = (getattr(order, "whatsapp_chat_id", None) or "").strip()
        if order_chat:
            targets_to_try.append(order_chat)

        # 2. Target candidate: normalized E.164 phone number as @c.us
        if customer_phone:
            if any(customer_phone.endswith(suffix) for suffix in ["@c.us", "@s.whatsapp.net"]):
                phone_chat_id = customer_phone
                clean_num = "".join(c for c in customer_phone.split("@")[0] if c.isdigit())
            elif "@lid" not in customer_phone:
                digits = "".join(c for c in customer_phone if c.isdigit())
                if digits.startswith("00"):
                    digits = digits[2:]
                elif digits.startswith("0"):
                    # Pakistani mobile format (e.g. 0300... -> 92300...)
                    digits = "92" + digits[1:]
                elif len(digits) == 10 and digits.startswith("3"):
                    # 10-digit Pakistani number missing country code (e.g. 3001234567 -> 923001234567)
                    digits = "92" + digits

                clean_num = digits
                if len(digits) >= 8:
                    phone_chat_id = f"{digits}@c.us"

        if phone_chat_id and phone_chat_id not in targets_to_try:
            targets_to_try.append(phone_chat_id)

        if not clean_num and customer_phone and "@lid" not in customer_phone:
            clean_num = "".join(c for c in customer_phone if c.isdigit())
            if clean_num.startswith("0"):
                clean_num = "92" + clean_num[1:]

        if not targets_to_try:
            logger.warning(f"[Order Notification] Cannot dispatch notification: No valid phone/chatId for order #{order.order_number} ({customer_phone})")
            return

        # 1. Try WAHA first (prioritizing the exact session of the ongoing chat)
        session_name = getattr(order, "whatsapp_session", None)
        waha_status = "NOT_STARTED"
        if session_name:
            session_name = str(session_name).strip()
            waha_status = await waha_service.get_waha_session_status(session_name)

        if waha_status != "WORKING":
            type_session = waha_service.get_session_name(business.id, business.business_type)
            type_status = await waha_service.get_waha_session_status(type_session)
            if type_status == "WORKING":
                session_name = type_session
                waha_status = type_status
            elif type_session != f"clinic_{business.id}":
                legacy_name = f"clinic_{business.id}"
                legacy_status = await waha_service.get_waha_session_status(legacy_name)
                if legacy_status == "WORKING":
                    session_name = legacy_name
                    waha_status = legacy_status

        sent = False
        if waha_status == "WORKING":
            for target in targets_to_try:
                sent = await waha_service.send_waha_text(session_name, target, msg)
                logger.info(f"[Order Notification WAHA] session={session_name}, target={target}, sent={sent}")
                if sent:
                    break
        else:
            logger.warning(f"[Order Notification WAHA] No active WORKING session found for business {business.id}")

        # 2. Fallback to Meta WhatsApp Cloud API if configured
        if not sent and business.inbound_phone_id and clean_num:
            try:
                await whatsapp_service.send_whatsapp_text(
                    to_phone=clean_num,
                    message=msg,
                    phone_number_id=business.inbound_phone_id
                )
                logger.info(f"[Order Notification Meta API] Sent to {clean_num}")
            except Exception as e:
                logger.warning(f"[Order Notification Meta API error] {e}")

    except Exception as e:
        logger.error(f"[send_order_status_notification error] {e}", exc_info=True)
    finally:
        db.close()


def authenticate_staff_by_pin(slug: str, pin: str, db: Session, screen_type: str = "kitchen") -> Business:
    clean_slug = slug.strip().lower()
    business = db.query(Business).filter(
        (Business.slug.ilike(clean_slug)) | (Business.name.ilike(clean_slug))
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail=f"Restaurant '{slug}' not found")

    pin_entered = pin.strip()
    st = screen_type.lower()
    if st == "rider":
        expected_pin = (getattr(business, "rider_pin", None) or "1234").strip()
    elif st == "pos":
        expected_pin = (getattr(business, "pos_pin", None) or "1234").strip()
    else:
        expected_pin = (business.kitchen_pin or "1234").strip()

    # Allow screen's specific PIN or master kitchen_pin as fallback
    if pin_entered != expected_pin and pin_entered != (business.kitchen_pin or "1234").strip():
        raise HTTPException(status_code=401, detail=f"Invalid {screen_type.upper()} PIN")
    return business


def check_cooking_timers(
    orders: List[RestaurantOrder],
    db: Session,
    background_tasks: Optional[BackgroundTasks] = None,
    business_id: Optional[UUID] = None
):
    """
    Auto-advances preparing / in_kitchen orders to 'ready' once 20 minutes have elapsed.
    """
    now = datetime.now(timezone.utc)
    changed = False
    for order in orders:
        if order.status in ["preparing", "in_kitchen"] and order.cooking_started_at:
            c_time = order.cooking_started_at
            if c_time.tzinfo is None:
                c_time = c_time.replace(tzinfo=timezone.utc)
            elapsed_seconds = (now - c_time).total_seconds()
            if elapsed_seconds >= 20 * 60:  # 20 minutes
                order.status = "ready"
                changed = True
                if background_tasks and business_id:
                    background_tasks.add_task(
                        send_order_status_notification,
                        order.id,
                        "ready",
                        business_id
                    )
    if changed:
        try:
            db.commit()
        except Exception:
            db.rollback()


@router.get(
    "/orders",
    response_model=List[RestaurantOrderResponse],
    summary="List all restaurant orders with optional status filter"
)
def list_orders(
    status: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    query = db.query(RestaurantOrder).filter(RestaurantOrder.business_id == current_business.id)
    if status and status.strip() and status != "all":
        query = query.filter(RestaurantOrder.status == status.strip())
    orders = query.order_by(RestaurantOrder.created_at.desc()).all()
    check_cooking_timers(orders, db, background_tasks, current_business.id)
    return orders


@router.get(
    "/orders/{order_id}",
    response_model=RestaurantOrderResponse,
    summary="Get single order details"
)
def get_order(
    order_id: UUID,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == current_business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post(
    "/orders",
    response_model=RestaurantOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually create an order from the restaurant dashboard"
)
def create_manual_order(
    payload: RestaurantOrderCreateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    total_bill = 0.0
    for item in payload.items:
        qty = item.get("quantity", 1)
        price = item.get("price", 0.0)
        total_bill += float(price) * float(qty)

    del_fee = (getattr(current_business, "delivery_charges", 0.0) or 0.0) if (payload.order_type == "delivery") else 0.0
    svc_fee = getattr(current_business, "service_charges", 0.0) or 0.0
    total_bill += del_fee + svc_fee

    ord_num = f"ORD-{random.randint(1000, 9999)}"
    new_order = RestaurantOrder(
        business_id=current_business.id,
        order_number=ord_num,
        customer_name=payload.customer_name.strip(),
        customer_phone=payload.customer_phone.strip(),
        order_type=payload.order_type,
        table_number=payload.table_number.strip() if payload.table_number else None,
        delivery_address=payload.delivery_address.strip() if payload.delivery_address else None,
        items=payload.items,
        total_amount=round(total_bill, 2),
        status="received",
        special_instructions=payload.special_instructions.strip() if payload.special_instructions else None,
        channel="dashboard"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order


@router.put(
    "/orders/{order_id}",
    response_model=RestaurantOrderResponse,
    summary="Update full order details (mistakes, items, address, customer details)"
)
def update_full_order(
    order_id: UUID,
    payload: RestaurantOrderUpdateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == current_business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if payload.customer_name is not None:
        order.customer_name = payload.customer_name.strip()
    if payload.customer_phone is not None:
        order.customer_phone = payload.customer_phone.strip()
    if payload.order_type is not None:
        order.order_type = payload.order_type
    if payload.table_number is not None:
        order.table_number = payload.table_number.strip() if payload.table_number else None
    if payload.delivery_address is not None:
        order.delivery_address = payload.delivery_address.strip() if payload.delivery_address else None
    if payload.special_instructions is not None:
        order.special_instructions = payload.special_instructions.strip() if payload.special_instructions else None
    if payload.items is not None:
        order.items = payload.items
        total_bill = 0.0
        for item in payload.items:
            qty = item.get("quantity", 1)
            price = item.get("price", 0.0)
            total_bill += float(price) * float(qty)
        order.total_amount = round(total_bill, 2)
    if payload.status is not None:
        order.status = payload.status

    db.commit()
    db.refresh(order)
    return order


@router.patch(
    "/orders/{order_id}/status",
    response_model=RestaurantOrderResponse,
    summary="Update kitchen order status and automatically notify customer via WhatsApp"
)
def update_order_status(
    order_id: UUID,
    payload: RestaurantOrderStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == current_business.id
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID '{order_id}' not found"
        )

    previous_status = order.status
    order.status = payload.status
    if payload.status in ["preparing", "in_kitchen"] and not order.cooking_started_at:
        order.cooking_started_at = datetime.now(timezone.utc)
    if payload.rider_name:
        order.rider_name = payload.rider_name.strip()
    db.commit()
    db.refresh(order)

    # If status actually changed, dispatch WhatsApp notification
    if previous_status != payload.status:
        background_tasks.add_task(
            send_order_status_notification,
            order.id,
            payload.status,
            current_business.id
        )

    return order


# ==================== RESTAURANT GENERAL SETTINGS ====================

@router.get(
    "/settings",
    response_model=RestaurantSettingsResponse,
    summary="Get restaurant general settings (name, slug, delivery & service charges)"
)
def get_restaurant_settings(
    current_business: Business = Depends(get_current_restaurant)
):
    return {
        "name": current_business.name,
        "slug": current_business.slug,
        "delivery_charges": getattr(current_business, "delivery_charges", 0.0) or 0.0,
        "service_charges": getattr(current_business, "service_charges", 0.0) or 0.0,
    }


@router.patch(
    "/settings",
    response_model=RestaurantSettingsResponse,
    summary="Update restaurant general settings (name, delivery & service charges)"
)
def update_restaurant_settings(
    payload: RestaurantSettingsUpdateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    if payload.name is not None and payload.name.strip():
        current_business.name = payload.name.strip()
    if payload.delivery_charges is not None:
        current_business.delivery_charges = float(payload.delivery_charges)
    if payload.service_charges is not None:
        current_business.service_charges = float(payload.service_charges)

    db.commit()
    db.refresh(current_business)
    return {
        "name": current_business.name,
        "slug": current_business.slug,
        "delivery_charges": current_business.delivery_charges or 0.0,
        "service_charges": current_business.service_charges or 0.0,
    }


# ==================== OPERATIONAL SCREENS & PINS (KDS, RIDER, POS) ====================

@router.get(
    "/settings/screen-pins",
    response_model=ScreenPinsResponse,
    summary="Get current PINs for all operational screens (Kitchen, Rider, POS)"
)
def get_screen_pins(
    current_business: Business = Depends(get_current_restaurant)
):
    return {
        "kitchen_pin": current_business.kitchen_pin or "1234",
        "rider_pin": getattr(current_business, "rider_pin", None) or "1234",
        "pos_pin": getattr(current_business, "pos_pin", None) or "1234",
        "slug": current_business.slug,
        "business_name": current_business.name
    }


@router.post(
    "/settings/screen-pins",
    response_model=ScreenPinsResponse,
    summary="Update or generate PINs for all operational screens (Kitchen, Rider, POS)"
)
def update_screen_pins(
    payload: ScreenPinsUpdateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    if payload.kitchen_pin is not None:
        current_business.kitchen_pin = payload.kitchen_pin.strip()
    if payload.rider_pin is not None:
        current_business.rider_pin = payload.rider_pin.strip()
    if payload.pos_pin is not None:
        current_business.pos_pin = payload.pos_pin.strip()
    db.commit()
    db.refresh(current_business)
    return {
        "kitchen_pin": current_business.kitchen_pin or "1234",
        "rider_pin": current_business.rider_pin or "1234",
        "pos_pin": current_business.pos_pin or "1234",
        "slug": current_business.slug,
        "business_name": current_business.name
    }


@router.get(
    "/settings/kitchen-pin",
    summary="Get current kitchen display PIN"
)
def get_kitchen_pin(
    current_business: Business = Depends(get_current_restaurant)
):
    return {
        "kitchen_pin": current_business.kitchen_pin or "1234",
        "rider_pin": getattr(current_business, "rider_pin", None) or "1234",
        "pos_pin": getattr(current_business, "pos_pin", None) or "1234",
        "slug": current_business.slug,
        "business_name": current_business.name
    }

@router.post(
    "/settings/kitchen-pin",
    summary="Update kitchen display PIN"
)
def update_kitchen_pin(
    payload: KitchenPinUpdateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    current_business.kitchen_pin = payload.pin.strip()
    db.commit()
    return {"message": "Kitchen PIN updated successfully", "kitchen_pin": current_business.kitchen_pin}

@router.post(
    "/kitchen/verify",
    summary="Verify PIN for operational screens (Kitchen, Rider, POS)"
)
def verify_kitchen_pin(
    payload: KitchenVerifyRequest,
    db: Session = Depends(get_db)
):
    screen_type = (payload.screen_type or "kitchen").lower()
    business = authenticate_staff_by_pin(payload.slug, payload.pin, db, screen_type=screen_type)
    token = create_access_token(data={"sub": str(business.id), "business_id": str(business.id)})
    return {
        "success": True,
        "business_id": str(business.id),
        "business_name": business.name,
        "slug": business.slug or payload.slug.strip().lower(),
        "delivery_charges": getattr(business, "delivery_charges", 0.0) or 0.0,
        "service_charges": getattr(business, "service_charges", 0.0) or 0.0,
        "token": token
    }

@router.get(
    "/kitchen/orders",
    response_model=List[RestaurantOrderResponse],
    summary="List orders for Kitchen Display System (KDS)"
)
def get_kitchen_orders(
    slug: str,
    pin: str,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="kitchen")
    orders = (
        db.query(RestaurantOrder)
        .filter(RestaurantOrder.business_id == business.id)
        .order_by(RestaurantOrder.created_at.desc())
        .all()
    )
    check_cooking_timers(orders, db, background_tasks, business.id)
    return orders

@router.patch(
    "/kitchen/orders/{order_id}/status",
    response_model=RestaurantOrderResponse,
    summary="Bump or update order status from Kitchen Display System"
)
def update_kitchen_order_status(
    order_id: UUID,
    slug: str,
    pin: str,
    payload: RestaurantOrderStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="kitchen")
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    previous_status = order.status
    order.status = payload.status
    if payload.status in ["preparing", "in_kitchen"] and not order.cooking_started_at:
        order.cooking_started_at = datetime.now(timezone.utc)
    if payload.rider_name:
        order.rider_name = payload.rider_name.strip()
    db.commit()
    db.refresh(order)

    if previous_status != payload.status:
        background_tasks.add_task(
            send_order_status_notification,
            order.id,
            payload.status,
            business.id
        )

    return order


# ==================== RIDER PORTAL (MOBILE-FIRST) ====================

@router.get(
    "/rider/orders",
    response_model=List[RestaurantOrderResponse],
    summary="List delivery orders for Rider Delivery Portal"
)
def get_rider_orders(
    slug: str,
    pin: str,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="rider")
    orders = (
        db.query(RestaurantOrder)
        .filter(
            RestaurantOrder.business_id == business.id,
            RestaurantOrder.order_type == "delivery"
        )
        .order_by(RestaurantOrder.created_at.desc())
        .all()
    )
    check_cooking_timers(orders, db, background_tasks, business.id)
    return orders


@router.patch(
    "/rider/orders/{order_id}/status",
    response_model=RestaurantOrderResponse,
    summary="Update delivery order status from Rider Portal (reached or delivered)"
)
def update_rider_order_status(
    order_id: UUID,
    slug: str,
    pin: str,
    payload: RiderOrderStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="rider")
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.order_type != "delivery":
        raise HTTPException(status_code=400, detail="Only delivery orders can be managed by rider")

    # Rider is explicitly restricted to setting reached or delivered (or out_for_delivery)
    if payload.status not in ["reached", "delivered", "out_for_delivery"]:
        raise HTTPException(status_code=400, detail="Rider can only set status to reached or delivered")

    previous_status = order.status
    order.status = payload.status
    if payload.rider_name:
        order.rider_name = payload.rider_name.strip()
    db.commit()
    db.refresh(order)

    if previous_status != payload.status:
        background_tasks.add_task(
            send_order_status_notification,
            order.id,
            payload.status,
            business.id
        )

    return order


# ==================== POS ORDER TAKING TERMINAL ====================

@router.get(
    "/pos/menu",
    summary="Get menu catalog and categories for POS screen"
)
def get_pos_menu(
    slug: str,
    pin: str,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="pos")
    items = db.query(MenuItem).filter(MenuItem.business_id == business.id).all()
    categories = (
        db.query(MenuCategory)
        .filter(MenuCategory.business_id == business.id, MenuCategory.is_active == True)
        .order_by(MenuCategory.display_order.asc(), MenuCategory.name.asc())
        .all()
    )
    return {
        "business_name": business.name,
        "slug": business.slug,
        "items": [
            {
                "id": str(i.id),
                "name": i.name,
                "category": i.category,
                "price": float(i.price),
                "is_available": i.is_available,
                "description": i.description,
                "variants": i.variants or [],
                "addons": i.addons or []
            }
            for i in items
        ],
        "categories": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "display_order": c.display_order
            }
            for c in categories
        ]
    }


@router.post(
    "/pos/orders",
    response_model=RestaurantOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create order from POS screen (pickup by default, or delivery/dine-in)"
)
def create_pos_order(
    slug: str,
    pin: str,
    payload: RestaurantOrderCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="pos")
    total_bill = 0.0
    for item in payload.items:
        qty = item.get("quantity", 1)
        price = item.get("price", 0.0)
        total_bill += float(price) * float(qty)

    del_fee = (getattr(business, "delivery_charges", 0.0) or 0.0) if (payload.order_type == "delivery") else 0.0
    svc_fee = getattr(business, "service_charges", 0.0) or 0.0
    total_bill += del_fee + svc_fee

    ord_num = f"POS-{random.randint(1000, 9999)}"
    new_order = RestaurantOrder(
        business_id=business.id,
        order_number=ord_num,
        customer_name=payload.customer_name.strip(),
        customer_phone=payload.customer_phone.strip(),
        order_type=payload.order_type or "pickup",
        table_number=payload.table_number.strip() if payload.table_number else None,
        delivery_address=payload.delivery_address.strip() if payload.delivery_address else None,
        items=payload.items,
        total_amount=round(total_bill, 2),
        status="received",
        special_instructions=payload.special_instructions.strip() if payload.special_instructions else None,
        channel="pos"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Automatically notify customer via WhatsApp if valid phone provided
    background_tasks.add_task(
        send_order_status_notification,
        new_order.id,
        "in_kitchen",
        business.id
    )

    return new_order


@router.get(
    "/pos/orders",
    response_model=List[RestaurantOrderResponse],
    summary="List all orders for POS screen review"
)
def get_pos_orders(
    slug: str,
    pin: str,
    status: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="pos")
    query = db.query(RestaurantOrder).filter(RestaurantOrder.business_id == business.id)
    if status and status.strip() and status != "all":
        query = query.filter(RestaurantOrder.status == status.strip())
    orders = query.order_by(RestaurantOrder.created_at.desc()).all()
    check_cooking_timers(orders, db, background_tasks, business.id)
    return orders


@router.patch(
    "/pos/orders/{order_id}/status",
    response_model=RestaurantOrderResponse,
    summary="Update order status from POS screen"
)
def update_pos_order_status(
    order_id: UUID,
    slug: str,
    pin: str,
    payload: RestaurantOrderStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="pos")
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    previous_status = order.status
    order.status = payload.status
    if payload.status in ["preparing", "in_kitchen"] and not order.cooking_started_at:
        order.cooking_started_at = datetime.now(timezone.utc)
    if payload.rider_name:
        order.rider_name = payload.rider_name.strip()
    db.commit()
    db.refresh(order)

    if previous_status != payload.status:
        background_tasks.add_task(
            send_order_status_notification,
            order.id,
            payload.status,
            business.id
        )

    return order


@router.put(
    "/pos/orders/{order_id}",
    response_model=RestaurantOrderResponse,
    summary="Update full order details from POS terminal"
)
def update_pos_full_order(
    order_id: UUID,
    slug: str,
    pin: str,
    payload: RestaurantOrderUpdateRequest,
    db: Session = Depends(get_db)
):
    business = authenticate_staff_by_pin(slug, pin, db, screen_type="pos")
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if payload.customer_name is not None:
        order.customer_name = payload.customer_name.strip()
    if payload.customer_phone is not None:
        order.customer_phone = payload.customer_phone.strip()
    if payload.order_type is not None:
        order.order_type = payload.order_type
    if payload.table_number is not None:
        order.table_number = payload.table_number.strip() if payload.table_number else None
    if payload.delivery_address is not None:
        order.delivery_address = payload.delivery_address.strip() if payload.delivery_address else None
    if payload.special_instructions is not None:
        order.special_instructions = payload.special_instructions.strip() if payload.special_instructions else None
    if payload.items is not None:
        order.items = payload.items
        total_bill = 0.0
        for item in payload.items:
            qty = item.get("quantity", 1)
            price = item.get("price", 0.0)
            total_bill += float(price) * float(qty)
        order.total_amount = round(total_bill, 2)
    if payload.status is not None:
        order.status = payload.status

    db.commit()
    db.refresh(order)
    return order
