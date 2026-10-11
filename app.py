#!/usr/bin/env python3
"""
Personal Order Tracker - Flask Backend Server
Serves static dashboard files and provides REST API for order management,
synchronizing changes directly with data/orders.json and updating exports.
"""
import os
import json
import csv
import io
import pathlib
from datetime import datetime
from flask import Flask, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename

# Import the export utility
import scripts.export as exporter

ROOT_DIR = pathlib.Path(__file__).resolve().parent
DATA_FILE = ROOT_DIR / "data" / "orders.json"
EXPORTS_DIR = ROOT_DIR / "exports"
UPLOAD_DIR = ROOT_DIR / "images" / "products"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
(ROOT_DIR / "data").mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=".", static_url_path="")

# Enable CORS for local dev (in case frontend is served from Live Server on :5500)
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

def read_orders():
    if not DATA_FILE.exists():
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error reading orders.json: {e}")
        return []

def write_orders(orders):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(orders, f, indent=2, ensure_ascii=False)
        # Automatically update exports on disk
        try:
            exporter.export_all()
        except Exception as ex_err:
            print(f"Warning: Failed to update exports: {ex_err}")
        return True
    except Exception as e:
        print(f"Error writing orders.json: {e}")
        return False

# ==========================
# Frontend Routes
# ==========================
@app.route("/")
def index():
    return send_from_directory(ROOT_DIR, "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory(ROOT_DIR, path)

# ==========================
# API Routes
# ==========================
@app.route("/api/orders", methods=["GET"])
def get_orders():
    orders = read_orders()
    return jsonify({"success": True, "orders": orders, "count": len(orders)})

@app.route("/api/orders", methods=["POST"])
def add_order():
    data = request.get_json() or {}
    orders = read_orders()
    
    # Generate ID if missing
    new_id = data.get("id") or f"ORD-{int(datetime.now().timestamp() * 1000)}"
    
    # Check for duplicate order number if provided
    order_no = str(data.get("orderNo", "")).strip()
    if order_no:
        existing = [o for o in orders if str(o.get("orderNo", "")).strip() == order_no]
        if existing:
            return jsonify({
                "success": False,
                "error": f"An order with Order Number '{order_no}' already exists ({existing[0].get('productName')})."
            }), 400

    order = {
        "id": new_id,
        "productName": data.get("productName") or data.get("item") or "Untitled Order",
        "platform": data.get("platform") or "Meesho",
        "orderNo": order_no,
        "orderedDate": data.get("orderedDate") or data.get("ordered") or datetime.now().strftime("%Y-%m-%d"),
        "expectedDeliveryDate": data.get("expectedDeliveryDate") or data.get("expected") or "",
        "actualDeliveryDate": data.get("actualDeliveryDate") or None,
        "price": data.get("price") if data.get("price") not in (None, "") else None,
        "quantity": int(data.get("quantity") or 1),
        "paymentMethod": data.get("paymentMethod") or data.get("payment") or "Cash on Delivery",
        "status": data.get("status") or "Order Placed",
        "received": bool(data.get("received", False)),
        "image": data.get("image") or "",
        "notes": data.get("notes") or ""
    }

    # Automatically mark actual delivery date if received
    if order["received"] and not order["actualDeliveryDate"]:
        order["actualDeliveryDate"] = datetime.now().strftime("%Y-%m-%d")
        if order["status"] not in ("Delivered", "Delivered / Received"):
            order["status"] = "Delivered"

    orders.append(order)
    write_orders(orders)
    return jsonify({"success": True, "order": order}), 201

@app.route("/api/orders/<order_id>", methods=["PUT"])
def update_order(order_id):
    data = request.get_json() or {}
    orders = read_orders()
    
    found = False
    for i, o in enumerate(orders):
        if str(o.get("id")) == str(order_id):
            # Check duplicate order number with other orders
            new_order_no = str(data.get("orderNo", "")).strip()
            if new_order_no:
                duplicate = [other for other in orders if other.get("id") != order_id and str(other.get("orderNo", "")).strip() == new_order_no]
                if duplicate:
                    return jsonify({
                        "success": False,
                        "error": f"Order Number '{new_order_no}' is already used by another order ({duplicate[0].get('productName')})."
                    }), 400

            # Update fields
            o["productName"] = data.get("productName") or data.get("item") or o.get("productName")
            o["platform"] = data.get("platform") or o.get("platform", "Meesho")
            o["orderNo"] = new_order_no
            o["orderedDate"] = data.get("orderedDate") or o.get("orderedDate", "")
            o["expectedDeliveryDate"] = data.get("expectedDeliveryDate") or o.get("expectedDeliveryDate", "")
            o["actualDeliveryDate"] = data.get("actualDeliveryDate")
            o["price"] = data.get("price") if data.get("price") not in (None, "") else None
            o["quantity"] = int(data.get("quantity") or 1)
            o["paymentMethod"] = data.get("paymentMethod") or o.get("paymentMethod", "Cash on Delivery")
            o["status"] = data.get("status") or o.get("status", "Order Placed")
            o["received"] = bool(data.get("received", False))
            o["image"] = data.get("image") if "image" in data else o.get("image", "")
            o["notes"] = data.get("notes") if "notes" in data else o.get("notes", "")

            # Sync actual delivery date
            if o["received"]:
                if not o.get("actualDeliveryDate"):
                    o["actualDeliveryDate"] = datetime.now().strftime("%Y-%m-%d")
                o["status"] = "Delivered"
            elif o["status"] == "Delivered" and not o["received"]:
                o["status"] = "On the Way"
                o["actualDeliveryDate"] = None

            found = True
            break

    if not found:
        return jsonify({"success": False, "error": f"Order with ID {order_id} not found"}), 404

    write_orders(orders)
    return jsonify({"success": True, "order": orders[i]})

@app.route("/api/orders/<order_id>", methods=["DELETE"])
def delete_order(order_id):
    orders = read_orders()
    initial_len = len(orders)
    orders = [o for o in orders if str(o.get("id")) != str(order_id)]
    
    if len(orders) == initial_len:
        return jsonify({"success": False, "error": f"Order with ID {order_id} not found"}), 404

    write_orders(orders)
    return jsonify({"success": True, "message": "Order deleted successfully"})

@app.route("/api/orders/<order_id>/receive", methods=["POST"])
def toggle_received(order_id):
    data = request.get_json() or {}
    orders = read_orders()
    
    for o in orders:
        if str(o.get("id")) == str(order_id):
            current_state = o.get("received", False)
            new_state = data.get("received") if "received" in data else not current_state
            
            o["received"] = bool(new_state)
            if o["received"]:
                o["status"] = "Delivered"
                o["actualDeliveryDate"] = datetime.now().strftime("%Y-%m-%d")
            else:
                o["status"] = data.get("revertStatus") or "On the Way"
                o["actualDeliveryDate"] = None
                
            write_orders(orders)
            return jsonify({"success": True, "order": o})

    return jsonify({"success": False, "error": "Order not found"}), 404

# ==========================
# Export & Download Routes
# ==========================
@app.route("/api/export/<format_name>", methods=["GET"])
def export_file(format_name):
    # Ensure exports are up-to-date
    exporter.export_all()
    
    format_lower = format_name.lower().strip(".")
    if format_lower == "xlsx":
        filepath = EXPORTS_DIR / "orders.xlsx"
        return send_file(filepath, as_attachment=True, download_name="orders.xlsx")
    elif format_lower == "csv":
        filepath = EXPORTS_DIR / "orders.csv"
        return send_file(filepath, as_attachment=True, download_name="orders.csv", mimetype="text/csv")
    elif format_lower in ("md", "markdown"):
        filepath = EXPORTS_DIR / "orders.md"
        return send_file(filepath, as_attachment=True, download_name="orders.md", mimetype="text/markdown")
    else:
        return jsonify({"success": False, "error": f"Unsupported format: {format_name}"}), 400

# ==========================
# Backup & Restore Routes
# ==========================
@app.route("/api/backup", methods=["GET"])
def download_backup():
    if not DATA_FILE.exists():
        return jsonify({"error": "No data found"}), 404
    date_str = datetime.now().strftime("%Y%m%d")
    return send_file(DATA_FILE, as_attachment=True, download_name=f"orders_backup_{date_str}.json")

@app.route("/api/backup/restore", methods=["POST"])
def restore_backup():
    if "file" not in request.files:
        # Check json body
        data = request.get_json()
        if isinstance(data, list):
            write_orders(data)
            return jsonify({"success": True, "count": len(data)})
        return jsonify({"success": False, "error": "No file or data provided"}), 400
    
    file = request.files["file"]
    try:
        content = json.load(file)
        if not isinstance(content, list):
            return jsonify({"success": False, "error": "Invalid format. Expected a list of orders."}), 400
        write_orders(content)
        return jsonify({"success": True, "count": len(content)})
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to parse JSON backup: {e}"}), 400

# ==========================
# CSV Import with Validation & Duplicate Prevention
# ==========================
@app.route("/api/import/csv", methods=["POST"])
def import_csv():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        stream = io.StringIO(file.stream.read().decode("utf-8-sig"), newline=None)
        reader = csv.reader(stream)
        rows = list(reader)
        if not rows:
            return jsonify({"success": False, "error": "CSV file is empty"}), 400

        headers = [h.strip().lower() for h in rows[0]]
        
        # Helper to find column index
        def col_idx(*names):
            for n in names:
                for idx, h in enumerate(headers):
                    if n in h:
                        return idx
            return -1

        name_idx = col_idx("product", "item", "title", "name")
        plat_idx = col_idx("platform", "website", "store")
        no_idx = col_idx("order no", "order number", "order_id", "order id")
        price_idx = col_idx("price", "amount", "cost")
        qty_idx = col_idx("quantity", "qty")
        pay_idx = col_idx("payment", "method")
        ordered_idx = col_idx("ordered", "order date")
        expected_idx = col_idx("expected", "delivery date", "due")
        actual_idx = col_idx("actual")
        status_idx = col_idx("status")
        rec_idx = col_idx("received", "delivered")
        notes_idx = col_idx("notes", "note", "comment")

        if name_idx == -1:
            return jsonify({"success": False, "error": "CSV must have a column for Product Name / Item."}), 400

        current_orders = read_orders()
        existing_order_nos = {str(o.get("orderNo", "")).strip() for o in current_orders if o.get("orderNo")}
        existing_signatures = {
            f"{(o.get('productName') or o.get('item','')).strip().lower()}|{o.get('platform','').lower()}|{o.get('orderedDate','')}"
            for o in current_orders
        }

        imported_count = 0
        skipped_duplicates = 0
        new_orders = []

        for row in rows[1:]:
            if not row or not any(c.strip() for c in row):
                continue
            
            p_name = row[name_idx].strip() if name_idx < len(row) else ""
            if not p_name:
                continue

            p_platform = row[plat_idx].strip() if plat_idx != -1 and plat_idx < len(row) else "Meesho"
            p_orderno = row[no_idx].strip() if no_idx != -1 and no_idx < len(row) else ""
            p_price_raw = row[price_idx].strip().replace("₹", "").replace(",", "") if price_idx != -1 and price_idx < len(row) else ""
            try:
                p_price = float(p_price_raw) if p_price_raw else None
            except ValueError:
                p_price = None

            p_qty = int(row[qty_idx].strip()) if qty_idx != -1 and qty_idx < len(row) and row[qty_idx].strip().isdigit() else 1
            p_payment = row[pay_idx].strip() if pay_idx != -1 and pay_idx < len(row) else "Cash on Delivery"
            p_ordered = row[ordered_idx].strip() if ordered_idx != -1 and ordered_idx < len(row) else datetime.now().strftime("%Y-%m-%d")
            p_expected = row[expected_idx].strip() if expected_idx != -1 and expected_idx < len(row) else ""
            p_actual = row[actual_idx].strip() if actual_idx != -1 and actual_idx < len(row) else None
            p_status = row[status_idx].strip() if status_idx != -1 and status_idx < len(row) else "Order Placed"
            
            rec_val = row[rec_idx].strip().lower() if rec_idx != -1 and rec_idx < len(row) else ""
            p_received = rec_val in ("yes", "true", "1", "delivered")
            p_notes = row[notes_idx].strip() if notes_idx != -1 and notes_idx < len(row) else ""

            # Duplicate check
            sig = f"{p_name.lower()}|{p_platform.lower()}|{p_ordered}"
            if (p_orderno and p_orderno in existing_order_nos) or sig in existing_signatures:
                skipped_duplicates += 1
                continue

            order_obj = {
                "id": f"ORD-{int(datetime.now().timestamp() * 1000) + imported_count}",
                "productName": p_name,
                "platform": p_platform,
                "orderNo": p_orderno,
                "orderedDate": p_ordered,
                "expectedDeliveryDate": p_expected,
                "actualDeliveryDate": p_actual,
                "price": p_price,
                "quantity": p_qty,
                "paymentMethod": p_payment,
                "status": "Delivered" if p_received else p_status,
                "received": p_received,
                "image": "",
                "notes": p_notes
            }
            new_orders.append(order_obj)
            if p_orderno:
                existing_order_nos.add(p_orderno)
            existing_signatures.add(sig)
            imported_count += 1

        all_orders = current_orders + new_orders
        write_orders(all_orders)

        return jsonify({
            "success": True,
            "importedCount": imported_count,
            "skippedDuplicates": skipped_duplicates,
            "totalCount": len(all_orders)
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to process CSV: {e}"}), 400

# ==========================
# Image Upload Route
# ==========================
@app.route("/api/upload-image", methods=["POST"])
def upload_image():
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image uploaded"}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"success": False, "error": "Empty filename"}), 400

    filename = secure_filename(f"prod_{int(datetime.now().timestamp())}_{file.filename}")
    save_path = UPLOAD_DIR / filename
    file.save(save_path)
    rel_path = f"images/products/{filename}"
    return jsonify({"success": True, "imagePath": rel_path})

if __name__ == "__main__":
    print("=" * 60)
    print(" 📦  Order Tracker Server Starting on http://127.0.0.1:5000")
    print("     Open http://127.0.0.1:5000 in your browser to access the app.")
    print("=" * 60)
    # Ensure export files are initialized
    exporter.export_all()
    app.run(host="127.0.0.1", port=5000, debug=True)
