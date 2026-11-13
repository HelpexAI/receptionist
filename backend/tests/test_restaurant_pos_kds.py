import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import Business, MenuItem, MenuCategory, RestaurantOrder
from app.security import create_access_token
from app.services.ai_agent import execute_get_menu, execute_place_order

@pytest.fixture
def restaurant_tenant(db: Session):
    uid = uuid.uuid4().hex[:6]
    biz = Business(
        name=f"Test Bistro {uid}",
        slug=f"bistro-{uid}",
        business_type="restaurant",
        username=f"bistro_{uid}",
        password_hash="fakehash",
        widget_token=f"widget_{uid}",
        kitchen_pin="5678",
        is_widget_enabled=True
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz

def test_menu_category_lifecycle(client: TestClient, db: Session, restaurant_tenant: Business):
    token = create_access_token(data={"sub": str(restaurant_tenant.id), "business_id": str(restaurant_tenant.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Category
    payload = {
        "name": "Burgers",
        "description": "Juicy gourmet beef & chicken burgers",
        "display_order": 1
    }
    res = client.post("/api/restaurant/categories", json=payload, headers=headers)
    assert res.status_code == 201
    cat_data = res.json()
    assert cat_data["name"] == "Burgers"
    cat_id = cat_data["id"]

    # 2. List Categories
    res = client.get("/api/restaurant/categories", headers=headers)
    assert res.status_code == 200
    cats = res.json()
    assert any(c["id"] == cat_id for c in cats)

    # 3. Delete Category
    res = client.delete(f"/api/restaurant/categories/{cat_id}", headers=headers)
    assert res.status_code == 204

def test_menu_item_with_variants_and_addons(client: TestClient, db: Session, restaurant_tenant: Business):
    token = create_access_token(data={"sub": str(restaurant_tenant.id), "business_id": str(restaurant_tenant.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Menu Item with variants and addons
    item_payload = {
        "name": "Zinger Crunch Burger",
        "category": "Burgers",
        "price": 450.0,
        "description": "Crispy fried chicken breast with spicy sauce",
        "is_available": True,
        "variants": [
            {"name": "Regular", "price": 450.0},
            {"name": "Large", "price": 650.0}
        ],
        "addons": [
            {"name": "Extra Cheese", "price": 80.0},
            {"name": "Garlic Mayo Dip", "price": 50.0}
        ]
    }
    res = client.post("/api/restaurant/menu", json=item_payload, headers=headers)
    assert res.status_code == 201
    created_item = res.json()
    item_id = created_item["id"]
    assert len(created_item["variants"]) == 2
    assert len(created_item["addons"]) == 2

    # 2. Test AI Agent execute_get_menu
    menu_result = execute_get_menu(restaurant_tenant.id, db)
    assert "menu_items" in menu_result
    found = next((m for m in menu_result["menu_items"] if m["id"] == item_id), None)
    assert found is not None
    assert len(found["variants"]) == 2
    assert len(found["addons"]) == 2

    # 3. Test AI Agent execute_place_order with Large variant + Extra Cheese addon
    order_items = [
        {
            "item_name": "Zinger Crunch Burger",
            "quantity": 2,
            "variant": "Large",
            "addons": ["Extra Cheese"],
            "notes": "No onion"
        }
    ]
    # Unit price for Large = 650, Extra Cheese = 80 => 730 * 2 = 1460 Rs.
    order_res = execute_place_order(
        business_id=restaurant_tenant.id,
        db=db,
        customer_name="Ali Khan",
        customer_phone="+923001234567",
        order_items=order_items,
        order_type="delivery",
        delivery_address="House 12, Street 4, F-7, Islamabad"
    )
    assert order_res["status"] == "received"
    assert order_res["total_amount"] == 1460.0
    assert order_res["items"][0]["variant"] == "Large"
    assert "Extra Cheese" in order_res["items"][0]["addons"]

def test_kitchen_pin_and_kds_pipeline(client: TestClient, db: Session, restaurant_tenant: Business):
    token = create_access_token(data={"sub": str(restaurant_tenant.id), "business_id": str(restaurant_tenant.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Update Kitchen PIN from dashboard settings
    res = client.post("/api/restaurant/settings/kitchen-pin", json={"pin": "9988"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["kitchen_pin"] == "9988"

    # 2. Verify Kitchen PIN on KDS screen
    verify_res = client.post("/api/restaurant/kitchen/verify", json={"slug": restaurant_tenant.slug, "pin": "9988"})
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True

    # 3. Create an order and verify kitchen fetch
    order = RestaurantOrder(
        business_id=restaurant_tenant.id,
        order_number="ORD-9999",
        customer_name="Hamza",
        customer_phone="+923331112233",
        order_type="pickup",
        items=[{"name": "Fries", "price": 200, "quantity": 1}],
        total_amount=200.0,
        status="received"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # 4. Fetch orders via KDS endpoint
    kds_orders_res = client.get(f"/api/restaurant/kitchen/orders?slug={restaurant_tenant.slug}&pin=9988")
    assert kds_orders_res.status_code == 200
    kds_orders = kds_orders_res.json()
    assert any(o["order_number"] == "ORD-9999" for o in kds_orders)

    # 5. Bump order to in_kitchen, then ready
    bump_res = client.patch(
        f"/api/restaurant/kitchen/orders/{order.id}/status?slug={restaurant_tenant.slug}&pin=9988",
        json={"status": "in_kitchen"}
    )
    assert bump_res.status_code == 200
    assert bump_res.json()["status"] == "in_kitchen"

    bump_res2 = client.patch(
        f"/api/restaurant/kitchen/orders/{order.id}/status?slug={restaurant_tenant.slug}&pin=9988",
        json={"status": "ready"}
    )
    assert bump_res2.status_code == 200
    assert bump_res2.json()["status"] == "ready"
