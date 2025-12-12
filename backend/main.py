import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime, timedelta
import sqlite3
from contextlib import contextmanager

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

DATA_DIR = os.getenv("DATA_DIR", "./data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "real_estate.db")

app = FastAPI(title="Real Estate Asset Brain API")

allow_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
]

allow_origin_regex = r"^https://.*\.vercel\.app$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS properties (
                id TEXT PRIMARY KEY,
                address TEXT NOT NULL,
                type TEXT,
                tenant_name TEXT,
                lease_type TEXT,
                rent_amount REAL,
                lease_start_date TEXT,
                lease_end_date TEXT,
                landlord_name TEXT,
                pan_number TEXT,
                created_at TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_issues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id TEXT,
                category TEXT,
                description TEXT,
                date TEXT,
                status TEXT,
                cost REAL,
                vendor TEXT,
                created_at TEXT,
                FOREIGN KEY (property_id) REFERENCES properties(id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id TEXT,
                type TEXT,
                filename TEXT,
                upload_date TEXT,
                extracted_data TEXT,
                content_summary TEXT,
                FOREIGN KEY (property_id) REFERENCES properties(id)
            )
        """)
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT,
                property_id TEXT
            )
        """)
        
        # Check if users exist and insert seed data
        cursor.execute("SELECT count(*) FROM users")
        if cursor.fetchone()[0] == 0:
            users = [
                ("user_owner", "Ishaan", "Ishaan123", "owner", None),
                ("user_tenant_1", "Chintu", "Chintu123", "tenant", "mumbai_galaxy"),
                ("user_tenant_2", "suresh", "tenant123", "tenant", "bangalore_tech"),
            ]
            cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?)", users)

        # Insert sample properties if empty
        cursor.execute("SELECT count(*) FROM properties")
        if cursor.fetchone()[0] == 0:
            properties = [
                ("mumbai_galaxy", "101, Galaxy Heights, Bandra West, Mumbai", "Residential", "Chintu", "11-Month Agreement", 85000, "2024-01-01", "2024-12-31", "Ishaan Chawla", "ABCPV1234A"),
                ("bangalore_tech", "Unit 402, Tech Park View, Koramangala, Bangalore", "Commercial", "Innovate Solutions Pvt Ltd", "Triple Net", 150000, "2023-04-01", "2026-03-31", "Ishaan Chawla", "XYZPM5678B"),
                ("delhi_villa", "Villa 12, Green Park, South Delhi", "Residential", "Mehta Family", "Standard Lease", 120000, "2024-06-01", "2025-05-31", "Ishaan Chawla", "PQRSJ9012C"),
            ]
            
            for prop in properties:
                cursor.execute("""
                    INSERT INTO properties (id, address, type, tenant_name, lease_type, rent_amount, lease_start_date, lease_end_date, landlord_name, pan_number, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (*prop, datetime.now().isoformat()))
            
            issues = [
                ("mumbai_galaxy", "plumbing", "Monsoon leakage in master bedroom wall", "2024-07-15", "Resolved", 4500, "QuickFix Utilities"),
                ("bangalore_tech", "electrical", "UPS Battery replacement for server room", "2024-02-20", "Resolved", 12000, "PowerSafe Ltd"),
                ("mumbai_galaxy", "electrical", "Geyser switch burnout", "2024-08-10", "Resolved", 850, "Local Electrician"),
                ("delhi_villa", "gardening", "Seasonal lawn maintenance and pruning", "2024-09-05", "In Progress", 2500, "Green Thumbs"),
                ("mumbai_galaxy", "painting", "Living room touch-up paint", "2024-01-10", "Resolved", 15000, "Asian Paints Service"),
            ]
            
            for issue in issues:
                cursor.execute("""
                    INSERT INTO maintenance_issues (property_id, category, description, date, status, cost, vendor, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (*issue, datetime.now().isoformat()))
        
        conn.commit()


init_db()

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(creds: LoginRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role, property_id FROM users WHERE username = ? AND password = ?", (creds.username, creds.password))
        user = cursor.fetchone()
        
        if user:
            return {"status": "success", "user": {"id": user[0], "username": user[1], "role": user[2], "property_id": user[3]}}
        return {"status": "error", "message": "Invalid credentials"}

class Property(BaseModel):
    id: str
    address: str
    type: Optional[str]
    tenant_name: Optional[str]
    lease_type: Optional[str]
    rent_amount: Optional[float]
    lease_start_date: Optional[str]
    lease_end_date: Optional[str]
    landlord_name: Optional[str]
    pan_number: Optional[str]

class MaintenanceIssue(BaseModel):
    id: Optional[int]
    property_id: str
    category: str
    description: str
    date: str
    status: str
    cost: float
    vendor: str

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    data: List[dict]
    query_type: str

@app.get("/")
async def root():
    return {"message": "Real Estate Asset Brain API", "status": "running"}

@app.get("/api/properties")
async def get_properties():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM properties")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

@app.get("/api/properties/{property_id}")
async def get_property(property_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM properties WHERE id = ?", (property_id,))
        prop = cursor.fetchone()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        
        cursor.execute("SELECT * FROM maintenance_issues WHERE property_id = ?", (property_id,))
        issues = cursor.fetchall()
        
        return {
            "property": dict(prop),
            "maintenance_history": [dict(issue) for issue in issues]
        }

@app.get("/api/maintenance")
async def get_maintenance():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.*, p.address 
            FROM maintenance_issues m
            JOIN properties p ON m.property_id = p.id
            ORDER BY m.date DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

class MaintenanceCreateRequest(BaseModel):
    property_id: str
    category: str
    description: str

@app.post("/api/maintenance")
async def create_maintenance_issue(issue: MaintenanceCreateRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO maintenance_issues (property_id, category, description, date, status, cost, vendor, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            issue.property_id,
            issue.category,
            issue.description,
            datetime.now().strftime("%Y-%m-%d"),
            "Open",
            0.0,
            "Pending Assignment",
            datetime.now().isoformat()
        ))
        conn.commit()
    return {"status": "success", "message": "Issue reported successfully"}

class TenantOnboardingRequest(BaseModel):
    username: str
    password: str
    name: str
    property_id: str
    rent_amount: float
    lease_start: str
    lease_end: str

@app.post("/api/tenants")
async def onboard_tenant(data: TenantOnboardingRequest):
    import uuid
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check username
        cursor.execute("SELECT 1 FROM users WHERE username = ?", (data.username,))
        if cursor.fetchone():
             return {"status": "error", "message": "Username already taken"}

        # Create Uer
        user_id = f"user_{str(uuid.uuid4())[:8]}"
        cursor.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?)", 
                      (user_id, data.username, data.password, "tenant", data.property_id))

        # Update Property
        cursor.execute("""
            UPDATE properties 
            SET tenant_name = ?, rent_amount = ?, lease_start_date = ?, lease_end_date = ?
            WHERE id = ?
        """, (data.name, data.rent_amount, data.lease_start, data.lease_end, data.property_id))
        
        conn.commit()
    
    return {"status": "success", "message": "Tenant onboarded successfully"}

class MaintenanceStatusUpdate(BaseModel):
    status: str

@app.put("/api/maintenance/{issue_id}/status")
async def update_maintenance_status(issue_id: int, update: MaintenanceStatusUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE maintenance_issues SET status = ? WHERE id = ?", (update.status, issue_id))
        conn.commit()
    return {"status": "success", "message": "Status updated"}

@app.post("/api/query")
async def query_brain(request: QueryRequest):
    query = request.query.lower()
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        if "plumbing" in query and ("mumbai" in query or "galaxy" in query):
            cursor.execute("""
                SELECT * FROM maintenance_issues 
                WHERE property_id = 'mumbai_galaxy' AND category = 'plumbing'
                ORDER BY date DESC
            """)
            issues = [dict(row) for row in cursor.fetchall()]
            if issues:
                latest = issues[0]
                return QueryResponse(
                    answer=f"The plumbing at 101 Galaxy Heights was last repaired on {latest['date']} by {latest['vendor']} (₹{latest['cost']:,.2f}). Issue: {latest['description']}",
                    data=issues,
                    query_type="maintenance_history"
                )
        
        elif "heating" in query and "2023" in query:
            cursor.execute("""
                SELECT m.*, p.address 
                FROM maintenance_issues m
                JOIN properties p ON m.property_id = p.id
                WHERE m.category = 'heating' AND m.date LIKE '2023%'
            """)
            issues = [dict(row) for row in cursor.fetchall()]
            return QueryResponse(
                answer=f"Found {len(issues)} heating complaint(s) in 2023.",
                data=issues,
                query_type="filtered_maintenance"
            )
        
        elif "lease" in query and ("expir" in query or "end" in query):
            six_months = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
            cursor.execute("""
                SELECT * FROM properties 
                WHERE lease_end_date <= ? AND lease_end_date >= ?
                ORDER BY lease_end_date
            """, (six_months, datetime.now().strftime("%Y-%m-%d")))
            props = [dict(row) for row in cursor.fetchall()]
            return QueryResponse(
                answer=f"Found {len(props)} lease(s) expiring in the next 6 months.",
                data=props,
                query_type="expiring_leases"
            )
        
        elif "maintenance" in query and "cost" in query:
            cursor.execute("""
                SELECT p.address, SUM(m.cost) as total_cost, COUNT(*) as issue_count
                FROM maintenance_issues m
                JOIN properties p ON m.property_id = p.id
                GROUP BY p.address
            """)
            costs = [dict(row) for row in cursor.fetchall()]
            total = sum(c['total_cost'] for c in costs)
            return QueryResponse(
                answer=f"Total maintenance costs across all properties: ${total:,.2f}",
                data=costs,
                query_type="financial_summary"
            )
        
        elif "triple net" in query or "nnn" in query:
            cursor.execute("SELECT * FROM properties WHERE lease_type = 'Triple Net'")
            props = [dict(row) for row in cursor.fetchall()]
            return QueryResponse(
                answer=f"Found {len(props)} Triple Net Lease properties.",
                data=props,
                query_type="lease_type_info"
            )
        
        elif "recurring" in query or "multiple" in query:
            cursor.execute("""
                SELECT property_id, category, COUNT(*) as occurrence_count, 
                       GROUP_CONCAT(date) as dates, SUM(cost) as total_cost
                FROM maintenance_issues
                GROUP BY property_id, category
                HAVING COUNT(*) > 1
                ORDER BY occurrence_count DESC
            """)
            recurring = [dict(row) for row in cursor.fetchall()]
            return QueryResponse(
                answer=f"Found {len(recurring)} recurring maintenance issues across properties.",
                data=recurring,
                query_type="recurring_issues"
            )
        
        else:
            cursor.execute("SELECT COUNT(*) as count FROM properties")
            prop_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT SUM(rent_amount) as total FROM properties")
            total_rent = cursor.fetchone()['total']
            
            cursor.execute("SELECT COUNT(*) as count FROM maintenance_issues WHERE status = 'In Progress'")
            active_issues = cursor.fetchone()['count']
            
            return QueryResponse(
                answer=f"System Overview: {prop_count} properties, ${total_rent:,.2f} total monthly rent, {active_issues} active maintenance issues.",
                data=[],
                query_type="system_overview"
            )

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), property_id: str = None):
    content = await file.read()
    
    extracted_data = {
        "filename": file.filename,
        "upload_date": datetime.now().isoformat(),
        "size": len(content),
        "type": file.content_type
    }
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO documents (property_id, type, filename, upload_date, extracted_data, content_summary)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            property_id or "unassigned",
            file.content_type,
            file.filename,
            datetime.now().isoformat(),
            json.dumps(extracted_data),
            f"Uploaded {file.filename}"
        ))
        conn.commit()
        doc_id = cursor.lastrowid
    
    return {
        "status": "success",
        "document_id": doc_id,
        "extracted_data": extracted_data,
        "message": f"Document '{file.filename}' processed successfully"
    }

@app.get("/api/documents")
async def get_documents():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents ORDER BY upload_date DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

@app.get("/api/analytics")
async def get_analytics():
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as count FROM properties")
        total_properties = cursor.fetchone()['count']
        
        cursor.execute("SELECT SUM(rent_amount) as total FROM properties")
        total_rent = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as count FROM maintenance_issues WHERE status = 'In Progress'")
        active_issues = cursor.fetchone()['count']
        
        cursor.execute("SELECT SUM(cost) as total FROM maintenance_issues")
        total_maintenance = cursor.fetchone()['total']
        
        cursor.execute("""
            SELECT category, COUNT(*) as count, SUM(cost) as total_cost
            FROM maintenance_issues
            GROUP BY category
        """)
        by_category = [dict(row) for row in cursor.fetchall()]
        
        return {
            "total_properties": total_properties,
            "total_monthly_rent": total_rent,
            "active_issues": active_issues,
            "total_maintenance_cost": total_maintenance,
            "issues_by_category": by_category
        }

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), property_id: str = Form(None), tenant_id: str = Form(None)):
    try:
        if not os.path.exists('uploads'):
            os.makedirs('uploads')
            
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        # Determine doc type
        doc_type = "lease" if "lease" in file.filename.lower() else "id_proof" if "pan" in file.filename.lower() or "aadhaar" in file.filename.lower() else "other"
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO documents (filename, type, upload_date, size, property_id)
                VALUES (?, ?, ?, ?, ?)
            """, (file.filename, doc_type, datetime.now().strftime("%Y-%m-%d"), len(content), property_id or "Unassigned"))
            conn.commit()
            
        return {"status": "success", "message": f"Uploaded {file.filename}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class PropertyCreate(BaseModel):
    address: str
    type: str
    rent_amount: float
    owner_name: str

@app.post("/api/properties")
async def create_property(prop: PropertyCreate):
    import uuid
    with get_db() as conn:
        cursor = conn.cursor()
        prop_id = f"prop_{str(uuid.uuid4())[:8]}"
        cursor.execute("""
            INSERT INTO properties (id, address, type, rent_amount, landlord_name)
            VALUES (?, ?, ?, ?, ?)
        """, (prop_id, prop.address, prop.type, prop.rent_amount, prop.owner_name))
        conn.commit()
    return {"status": "success", "message": "Property created"}

@app.post("/api/qr")
async def upload_qr(file: UploadFile = File(...)):
    try:
        # Save as static filename
        with open("static/payment_qr.png", "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        return {"status": "success", "message": "QR Updated"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/qr")
async def get_qr():
    if os.path.exists("static/payment_qr.png"):
        from fastapi.responses import FileResponse
        return FileResponse("static/payment_qr.png")
    return {"status": "error", "message": "No QR code"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
