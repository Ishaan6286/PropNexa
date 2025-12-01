import os
from fastapi import FastAPI, UploadFile, File, HTTPException
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
        
        conn.commit()
        
        cursor.execute("SELECT COUNT(*) FROM properties")
        if cursor.fetchone()[0] == 0:
            insert_sample_data(conn)

def insert_sample_data(conn):
    cursor = conn.cursor()
    
    properties = [
        ("12_elm_street", "12 Elm Street", "Commercial", "Acme Corp", "Triple Net", 5000, "2023-01-15", "2028-01-14"),
        ("45_oak_avenue", "45 Oak Avenue", "Residential", "Smith Family", "Gross Lease", 2500, "2024-01-01", "2025-06-30"),
        ("78_pine_road", "78 Pine Road", "Mixed Use", "Tech Startup Inc", "Modified Gross", 7500, "2024-06-01", "2026-12-31"),
    ]
    
    for prop in properties:
        cursor.execute("""
            INSERT INTO properties (id, address, type, tenant_name, lease_type, rent_amount, lease_start_date, lease_end_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (*prop, datetime.now().isoformat()))
    
    issues = [
        ("12_elm_street", "roof", "Water infiltration northeast corner", "2023-03-15", "Resolved", 3200, "ABC Roofing"),
        ("45_oak_avenue", "heating", "HVAC system failure - no heat", "2023-11-20", "Resolved", 1500, "Climate Control Co"),
        ("12_elm_street", "plumbing", "Bathroom leak on 2nd floor", "2024-02-10", "Resolved", 450, "Quick Plumbers"),
        ("78_pine_road", "electrical", "Circuit breaker tripping issues", "2024-05-22", "In Progress", 0, "ElectroFix"),
        ("12_elm_street", "plumbing", "Kitchen sink backup", "2024-08-15", "Resolved", 350, "Quick Plumbers"),
    ]
    
    for issue in issues:
        cursor.execute("""
            INSERT INTO maintenance_issues (property_id, category, description, date, status, cost, vendor, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (*issue, datetime.now().isoformat()))
    
    conn.commit()

init_db()

class Property(BaseModel):
    id: str
    address: str
    type: Optional[str]
    tenant_name: Optional[str]
    lease_type: Optional[str]
    rent_amount: Optional[float]
    lease_start_date: Optional[str]
    lease_end_date: Optional[str]

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

@app.post("/api/query")
async def query_brain(request: QueryRequest):
    query = request.query.lower()
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        if "roof" in query and ("elm" in query or "12" in query):
            cursor.execute("""
                SELECT * FROM maintenance_issues 
                WHERE property_id = '12_elm_street' AND category = 'roof'
                ORDER BY date DESC
            """)
            issues = [dict(row) for row in cursor.fetchall()]
            if issues:
                latest = issues[0]
                return QueryResponse(
                    answer=f"The roof at 12 Elm Street was last repaired on {latest['date']} by {latest['vendor']} (${latest['cost']:,.2f}). Issue: {latest['description']}",
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
