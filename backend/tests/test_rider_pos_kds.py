import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import Business, MenuItem, MenuCategory, RestaurantOrder
from app.security import create_access_token

@pytest.fixture
def test_restaurant(db: Session):
    uid = uuid.uuid4().hex[:6]
    biz = Business(
        name=f"Chef Royal {uid}",
        slug=f"royal-{uid}",
        business_type="restaurant",
        username=f"royal_{uid}",
        password_hash="fakehash",
        widget_token=f"widget_{uid}",
        kitchen_pin="7890",
        is_widget_enabled=True
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz

def test_pin_verification(client: TestClient, test_restaurant: Business):
    # 1. Correct PIN
    res = client.post("/api/restaurant/kitchen/verify", json={"slug": test_restaurant.slug, "pin": "7890"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["business_id"] == str(test_restaurant.id)
    assert "token" in data

    # 2. Incorrect PIN
    res_bad = client.post("/api/restaurant/kitchen/verify", json={"slug": test_restaurant.slug, "pin": "0000"})
    assert res_bad.status_code == 401

def test_kds_bump_to_delivered_and_picked_up(client: TestClient, db: Session, test_restaurant: Business):
    order = RestaurantOrder(
        business_id=test_restaurant.id,
        order_number="ORD-101",
        customer_name="Zubair",
        customer_phone="+923001112233",
        order_type="pickup",
        items=[{"name": "Club Sandwich", "price": 450, "quantity": 1}],
        total_amount=450.0,
        status="ready"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Kitchen sets status to picked_up
    res = client.patch(
        f"/api/restaurant/kitchen/orders/{order.id}/status?slug={test_restaurant.slug}&pin=7890",
        json={"status": "picked_up"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "picked_up"

    # Kitchen can also set status to delivered
    res2 = client.patch(
        f"/api/restaurant/kitchen/orders/{order.id}/status?slug={test_restaurant.slug}&pin=7890",
        json={"status": "delivered"}
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "delivered"

def test_20_min_cooking_timer_auto_ready(client: TestClient, db: Session, test_restaurant: Business):
    # Order in kitchen cooking for > 20 minutes
    past_cooking_time = datetime.now(timezone.utc) - timedelta(minutes=21)
    order = RestaurantOrder(
        business_id=test_restaurant.id,
        order_number="ORD-202",
        customer_name="Usman",
        customer_phone="+923004445566",
        order_type="delivery",
        delivery_address="House 4, Street 10, F-7, Islamabad",
        items=[{"name": "Beef Burger", "price": 750, "quantity": 2}],
        total_amount=1500.0,
        status="in_kitchen",
        cooking_started_at=past_cooking_time
    )
    db.add(order)
    db.commit()

    # When KDS or Rider fetches orders, auto-advance transitions to 'ready'
    res = client.get(f"/api/restaurant/kitchen/orders?slug={test_restaurant.slug}&pin=7890")
    assert res.status_code == 200
    orders = res.json()
    matching = next((o for o in orders if o["order_number"] == "ORD-202"), None)
    assert matching is not None
    assert matching["status"] == "ready"

def test_rider_portal_delivery_workflow(client: TestClient, db: Session, test_restaurant: Business):
    # Delivery order that is ready
    order = RestaurantOrder(
        business_id=test_restaurant.id,
        order_number="ORD-303",
        customer_name="Fatima",
        customer_phone="+923009998877",
        order_type="delivery",
        delivery_address="Apartment 5B, Gulberg Heights, Lahore",
        items=[{"name": "Chicken Karahi", "price": 1200, "quantity": 1}],
        total_amount=1200.0,
        status="ready"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # 1. Rider fetches delivery orders
    res = client.get(f"/api/restaurant/rider/orders?slug={test_restaurant.slug}&pin=7890")
    assert res.status_code == 200
    r_orders = res.json()
    assert any(o["id"] == str(order.id) for o in r_orders)

    # 2. Rider sets status to reached
    res_reached = client.patch(
        f"/api/restaurant/rider/orders/{order.id}/status?slug={test_restaurant.slug}&pin=7890",
        json={"status": "reached", "rider_name": "Rider Ahmed"}
    )
    assert res_reached.status_code == 200
    assert res_reached.json()["status"] == "reached"
    assert res_reached.json()["rider_name"] == "Rider Ahmed"

    # 3. Rider sets status to delivered
    res_delivered = client.patch(
        f"/api/restaurant/rider/orders/{order.id}/status?slug={test_restaurant.slug}&pin=7890",
        json={"status": "delivered"}
    )
    assert res_delivered.status_code == 200
    assert res_delivered.json()["status"] == "delivered"

    # 4. Rider cannot set unauthorized statuses (e.g. cancelled)
    res_unauth = client.patch(
        f"/api/restaurant/rider/orders/{order.id}/status?slug={test_restaurant.slug}&pin=7890",
        json={"status": "cancelled"}
    )
    assert res_unauth.status_code == 422 or res_unauth.status_code == 400

def test_pos_terminal_workflow(client: TestClient, db: Session, test_restaurant: Business):
    # 1. Add menu category & item
    cat = MenuCategory(business_id=test_restaurant.id, name="Beverages")
    db.add(cat)
    db.commit()
    item = MenuItem(
        business_id=test_restaurant.id,
        name="Fresh Lime",
        category="Beverages",
        price=180.0,
        variants=[{"name": "Regular", "price": 180}, {"name": "Large", "price": 250}],
        addons=[{"name": "Extra Mint", "price": 30}]
    )
    db.add(item)
    db.commit()

    # 2. Get POS menu
    res_menu = client.get(f"/api/restaurant/pos/menu?slug={test_restaurant.slug}&pin=7890")
    assert res_menu.status_code == 200
    menu_data = res_menu.json()
    assert len(menu_data["items"]) >= 1
    assert any(c["name"] == "Beverages" for c in menu_data["categories"])

    # 3. Create POS order (default pickup)
    pos_payload = {
        "customer_name": "Hamza",
        "customer_phone": "+923211234567",
        "order_type": "pickup",
        "items": [
            {
                "name": "Fresh Lime",
                "variant": "Large",
                "addons": ["Extra Mint"],
                "price": 280.0,
                "quantity": 2,
                "subtotal": 560.0
            }
        ],
        "special_instructions": "Less ice please"
    }
    res_create = client.post(
        f"/api/restaurant/pos/orders?slug={test_restaurant.slug}&pin=7890",
        json=pos_payload
    )
    assert res_create.status_code == 201
    created_order = res_create.json()
    assert created_order["order_type"] == "pickup"
    assert created_order["total_amount"] == 560.0
    assert created_order["channel"] == "pos"
    order_id = created_order["id"]

    # 4. List POS orders
    res_list = client.get(f"/api/restaurant/pos/orders?slug={test_restaurant.slug}&pin=7890")
    assert res_list.status_code == 200
    assert any(o["id"] == order_id for o in res_list.json())

    # 5. Update POS order status
    res_update = client.patch(
        f"/api/restaurant/pos/orders/{order_id}/status?slug={test_restaurant.slug}&pin=7890",
        json={"status": "ready"}
    )
    assert res_update.status_code == 200
    assert res_update.json()["status"] == "ready"

    # 6. Full edit of order (mistake correction: customer name, items, type, table_number)
    edit_payload = {
        "customer_name": "Hamza Tariq",
        "order_type": "delivery",
        "table_number": None,
        "delivery_address": "Street 9, House 12, G-11, Islamabad",
        "items": [
            {
                "name": "Fresh Lime",
                "variant": "Large",
                "addons": ["Extra Mint"],
                "price": 280.0,
                "quantity": 3,
                "subtotal": 840.0
            }
        ],
        "special_instructions": "Send extra straws"
    }
    res_edit = client.put(
        f"/api/restaurant/pos/orders/{order_id}?slug={test_restaurant.slug}&pin=7890",
        json=edit_payload
    )
    assert res_edit.status_code == 200
    edited = res_edit.json()
    assert edited["customer_name"] == "Hamza Tariq"
    assert edited["order_type"] == "delivery"
    assert edited["delivery_address"] == "Street 9, House 12, G-11, Islamabad"
    assert edited["total_amount"] == 840.0
    assert edited["special_instructions"] == "Send extra straws"

    # 7. Create Dine-In order with optional table number
    dine_in_payload = {
        "customer_name": "Sarah Khan",
        "customer_phone": "+923009988776",
        "order_type": "dine_in",
        "table_number": "Table 5",
        "items": [
            {
                "name": "Fresh Lime",
                "price": 250.0,
                "quantity": 2,
                "subtotal": 500.0
            }
        ]
    }
    res_dine = client.post(
        f"/api/restaurant/pos/orders?slug={test_restaurant.slug}&pin=7890",
        json=dine_in_payload
    )
    assert res_dine.status_code == 201
    dine_order = res_dine.json()
    assert dine_order["order_type"] == "dine_in"
    assert dine_order["table_number"] == "Table 5"


def test_screen_pins_management(client: TestClient, test_restaurant: Business):
    # Authenticate as restaurant owner
    token = create_access_token(data={"sub": str(test_restaurant.id), "business_id": str(test_restaurant.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get current screen pins
    res_get = client.get("/api/restaurant/settings/screen-pins", headers=headers)
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["kitchen_pin"] == "7890"
    assert data["rider_pin"] == "1234"
    assert data["pos_pin"] == "1234"
    assert data["slug"] == test_restaurant.slug

    # 2. Update screen pins with new distinct 4-digit PINs
    update_payload = {
        "kitchen_pin": "5566",
        "rider_pin": "7788",
        "pos_pin": "9900"
    }
    res_update = client.post("/api/restaurant/settings/screen-pins", headers=headers, json=update_payload)
    assert res_update.status_code == 200
    updated_data = res_update.json()
    assert updated_data["kitchen_pin"] == "5566"
    assert updated_data["rider_pin"] == "7788"
    assert updated_data["pos_pin"] == "9900"

    # 3. Verify screen-specific PIN verification
    # Rider PIN verification
    res_rider_ok = client.post(
        "/api/restaurant/kitchen/verify",
        json={"slug": test_restaurant.slug, "pin": "7788", "screen_type": "rider"}
    )
    assert res_rider_ok.status_code == 200
    assert res_rider_ok.json()["success"] is True

    # Rider PIN verification failure with wrong pin
    res_rider_bad = client.post(
        "/api/restaurant/kitchen/verify",
        json={"slug": test_restaurant.slug, "pin": "1111", "screen_type": "rider"}
    )
    assert res_rider_bad.status_code == 401

    # POS PIN verification
    res_pos_ok = client.post(
        "/api/restaurant/kitchen/verify",
        json={"slug": test_restaurant.slug, "pin": "9900", "screen_type": "pos"}
    )
    assert res_pos_ok.status_code == 200
    assert res_pos_ok.json()["success"] is True

    # Master fallback: Kitchen PIN (5566) works as fallback on rider screen
    res_master_fallback = client.post(
        "/api/restaurant/kitchen/verify",
        json={"slug": test_restaurant.slug, "pin": "5566", "screen_type": "rider"}
    )
    assert res_master_fallback.status_code == 200
    assert res_master_fallback.json()["success"] is True
