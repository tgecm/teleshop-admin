#!/usr/bin/env python3
"""Add FCM notification triggers for new orders and status changes."""
with open("/home/meriko/VPS/backend-api/backend.py", "r") as f:
    code = f.read()

changes = 0

# 1. Add FCM notification in create_public_order - after the existing Telegram notification block
old_public = '''                    except:
                        pass
    except:
        pass

    return {"success": True, "order_id": result["id"], "order_number": result["order_number"]}'''

new_public = '''                    except:
                        pass
                # Send FCM push notification to admin
                try:
                    _send_fcm_notification(tid, "New Order Received",
                        f"Order #{order_number} - {customer_name} - {format(float(total_amount), ',.0f')} MMK",
                        {"url": "/orders"})
                except:
                    pass
    except:
        pass

    return {"success": True, "order_id": result["id"], "order_number": result["order_number"]}'''

if old_public in code:
    code = code.replace(old_public, new_public)
    changes += 1
    print("OK - added FCM trigger in create_public_order")
else:
    print("FAIL - create_public_order pattern not found")

# 2. Add FCM notification in update_order_status - before the return
old_status_end = '''        except Exception as e:
            print(f"[Order] Status notification error: {e}")

    return {"success": True}'''

new_status_end = '''        except Exception as e:
            print(f"[Order] Status notification error: {e}")

    try:
        order_info = db.q("SELECT order_number, total_amount FROM orders WHERE id=%s", (order_id,), fetch_one=True)
        if order_info:
            onum = order_info.get("order_number", f"#{order_id}")
            amt = order_info.get("total_amount", 0)
            status_label = status.replace("_", " ").title()
            admins = db.q(
                "SELECT u.telegram_id FROM users u JOIN managed_bots b ON u.bot_id=b.id "
                "WHERE b.id=(SELECT bot_id FROM orders WHERE id=%s) AND u.is_admin=TRUE AND u.telegram_id IS NOT NULL",
                (order_id,), fetch=True
            ) or []
            for admin in admins:
                tid = admin.get("telegram_id")
                if tid:
                    try:
                        _send_fcm_notification(tid, f"Order {status_label}",
                            f"Order #{onum} - {format(float(amt or 0), ',.0f')} MMK",
                            {"url": "/orders"})
                    except:
                        pass
    except:
        pass

    return {"success": True}'''

if old_status_end in code:
    code = code.replace(old_status_end, new_status_end)
    changes += 1
    print("OK - added FCM trigger in update_order_status")
else:
    print("FAIL - update_order_status pattern not found")

if changes == 2:
    with open("/home/meriko/VPS/backend-api/backend.py", "w") as f:
        f.write(code)
    print(f"Both changes applied successfully")
else:
    print(f"Only {changes}/2 changes applied — file NOT saved")
