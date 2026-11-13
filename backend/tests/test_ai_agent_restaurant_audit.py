import pytest
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from app.models import Business, MenuItem, RestaurantOrder, RestaurantTable
from app.services.ai_agent import (
    get_system_prompt,
    execute_get_menu,
    execute_place_order,
    execute_get_order_status,
    execute_check_table_availability,
    execute_reserve_table_and_order
)

def test_restaurant_system_prompt_includes_charges_and_name(db):
    uid = uuid4().hex[:6]
    biz = Business(
        id=uuid4(),
        name="Tiwana Grand Restaurant",
        business_type="restaurant",
        slug=f"tiwana-grand-{uid}",
        username=f"user_{uid}",
        password_hash="fakehash",
        widget_token=f"widget_{uid}",
        delivery_charges=150.0,
        service_charges=50.0
    )
    db.add(biz)
    db.commit()

    prompt = get_system_prompt(biz, customer_phone="+923001234567")
    assert "Tiwana Grand Restaurant" in prompt
    assert "Delivery Charges: Rs. 150" in prompt
    assert "Service Charges: Rs. 50" in prompt
    assert "+923001234567" in prompt
    assert "dine_in" in prompt
    assert "table_number" in prompt

def test_ai_place_order_with_variants_addons_and_surcharges(db):
    uid = uuid4().hex[:6]
    biz = Business(
        id=uuid4(),
        name="Tiwana Diner",
        business_type="restaurant",
        slug=f"tiwana-diner-{uid}",
        username=f"user_{uid}",
        password_hash="fakehash",
        widget_token=f"widget_{uid}",
        delivery_charges=120.0,
        service_charges=30.0
    )
    db.add(biz)
    db.commit()

    dish = MenuItem(
        id=uuid4(),
        business_id=biz.id,
        name="Zinger Burger",
        category="Burgers",
        price=500.0,
        is_available=True,
        variants=[{"name": "Regular", "price": 500.0}, {"name": "Large", "price": 650.0}],
        addons=[{"name": "Extra Cheese", "price": 80.0}, {"name": "Garlic Dip", "price": 50.0}]
    )
    db.add(dish)
    db.commit()

    # 1. Test get_menu tool
    menu_res = execute_get_menu(biz.id, db)
    assert len(menu_res["menu_items"]) >= 1
    found = [m for m in menu_res["menu_items"] if m["name"] == "Zinger Burger"][0]
    assert len(found["variants"]) == 2
    assert len(found["addons"]) == 2

    # 2. Test place_order tool for delivery
    order_res = execute_place_order(
        business_id=biz.id,
        db=db,
        customer_name="Arslan Ali",
        customer_phone="+923009998877",
        order_items=[{
            "item_name": "Zinger Burger",
            "quantity": 2,
            "variant": "Large",
            "addons": ["Extra Cheese"],
            "notes": "extra spicy"
        }],
        order_type="delivery",
        delivery_address="House 42, St 5, Phase 6 DHA",
        whatsapp_chat_id="923009998877@c.us"
    )

    # Unit price = 650 (Large) + 80 (Extra Cheese) = 730
    # Items subtotal = 730 * 2 = 1460
    # Delivery fee = 120, Service fee = 30
    # Grand total = 1460 + 120 + 30 = 1610
    assert order_res["status"] == "received"
    assert order_res["total_amount"] == 1610.0
    assert order_res["delivery_fee"] == 120.0
    assert order_res["service_fee"] == 30.0
    assert order_res["order_type"] == "delivery"
    assert "ORD-" in order_res["order_number"]

    # 3. Test Dine-in with Table Number
    dine_res = execute_place_order(
        business_id=biz.id,
        db=db,
        customer_name="Hamza",
        customer_phone="+923211112233",
        order_items=[{"item_name": "Zinger Burger", "quantity": 1}],
        order_type="dine_in",
        table_number="Table 7"
    )
    assert dine_res["order_type"] == "dine_in"
    assert dine_res["table_number"] == "Table 7"
    # Unit price = 500 (Regular default), Delivery = 0, Service = 30 -> 530
    assert dine_res["total_amount"] == 530.0

def test_ai_get_order_status_lifecycle_and_timers(db):
    uid = uuid4().hex[:6]
    biz = Business(
        id=uuid4(),
        name="Tiwana Quick",
        business_type="restaurant",
        slug=f"tiwana-quick-{uid}",
        username=f"user_{uid}",
        password_hash="fakehash",
        widget_token=f"widget_{uid}"
    )
    db.add(biz)
    db.commit()

    # Create order cooking for 5 minutes
    now = datetime.now(timezone.utc)
    order = RestaurantOrder(
        business_id=biz.id,
        order_number="ORD-7890",
        customer_name="Saeed",
        customer_phone="+923334445566",
        order_type="delivery",
        delivery_address="Model Town, Lahore",
        items=[{"name": "Pizza", "price": 1200, "quantity": 1}],
        total_amount=1200,
        status="in_kitchen",
        cooking_started_at=now - timedelta(minutes=5),
        whatsapp_chat_id="923334445566@c.us"
    )
    db.add(order)
    db.commit()

    # Query status by order number
    st1 = execute_get_order_status(biz.id, db, order_number="7890")
    assert st1["found"] is True
    assert st1["status"] == "in_kitchen"
    assert st1["estimated_cooking_minutes_remaining"] == 15
    assert "Estimated remaining time: ~15 minutes" in st1["status_explanation"]

    # Query status by customer WhatsApp chat id without order number
    st2 = execute_get_order_status(biz.id, db, whatsapp_chat_id="923334445566@c.us")
    assert st2["found"] is True
    assert st2["order_number"] == "ORD-7890"

    # Advance cooking time to 21 minutes ago -> should auto-advance to "ready"
    order.cooking_started_at = now - timedelta(minutes=21)
    db.commit()

    st3 = execute_get_order_status(biz.id, db, order_number="ORD-7890")
    assert st3["found"] is True
    assert st3["status"] == "ready"
    assert "Freshly prepared and ready" in st3["status_explanation"]

    # Test Rider statuses: reached and delivered
    order.status = "reached"
    db.commit()
    st4 = execute_get_order_status(biz.id, db, order_number="ORD-7890")
    assert "Rider has reached your address" in st4["status_explanation"]

    order.status = "delivered"
    db.commit()
    st5 = execute_get_order_status(biz.id, db, order_number="ORD-7890")
    assert "Delivered" in st5["status_explanation"]
