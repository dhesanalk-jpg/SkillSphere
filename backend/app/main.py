from __future__ import annotations

import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parents[1]
DB_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "skillsphere.db"))

app = FastAPI(
    title="SkillSphere API",
    description="Backend API for SkillSphere community skill exchange.",
    version="1.0.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_state() -> dict[str, Any]:
    me = {
        "id": "me", "name": "You", "handle": "@you", "role": "Curious builder",
        "location": "Bengaluru, India",
        "bio": "I believe everyone has something worth teaching and something worth learning.",
        "avatar": "YO", "color": "violet", "teaches": ["Java", "React"],
        "learns": ["Graphic Design", "Figma", "Photography"], "level": "Intermediate",
        "rating": 5, "sessions": 3,
        "availability": ["Weekday evenings", "Saturday morning", "Sunday afternoon"],
        "format": "Both", "interests": ["Technology", "Design", "Startups"],
        "verified": True, "projects": ["My first portfolio"],
    }
    raw_people = [
        ("u1", "Aarav Mehta", "@aarav.codes", "Full-stack developer", "Bengaluru, India", "I enjoy turning ideas into clean, useful products. Happy to teach Java and frontend fundamentals.", "AM", "violet", ["Java", "React"], ["Graphic Design", "Figma"], "Intermediate", 4.9, 18, ["Weekday evenings", "Saturday morning", "Sunday afternoon"], "Both", ["Technology", "Design", "Startups"], True, ["CampusConnect", "Weatherly dashboard"]),
        ("u2", "Mira Shah", "@miramakes", "Visual designer", "Pune, India", "Brand identity, Figma and visual storytelling. I want to become more confident with Java.", "MS", "peach", ["Graphic Design", "Figma"], ["Java", "Python"], "Advanced", 4.8, 24, ["Weekday evenings", "Saturday morning"], "Online", ["Design", "Technology", "Photography"], True, ["Local brand identity", "App redesign"]),
        ("u3", "Kabir Rao", "@kabirframes", "Photographer & editor", "Mysuru, India", "I teach photography and editing through practical mini challenges. Looking for design and storytelling skills.", "KR", "blue", ["Photography", "Video Editing"], ["Graphic Design", "Public Speaking"], "Advanced", 4.9, 31, ["Saturday morning", "Sunday afternoon"], "Both", ["Design", "Photography", "Creative Arts"], True, ["Street stories series", "Travel reel"]),
        ("u4", "Nisha Iyer", "@nishaspeaks", "Communication coach", "Chennai, India", "Helping people speak with clarity. Currently exploring Python and data visualisation.", "NI", "mint", ["Public Speaking", "English"], ["Python", "Data Visualization"], "Advanced", 4.7, 12, ["Weekday evenings", "Sunday afternoon"], "Online", ["Technology", "Writing", "Community"], False, ["TEDx practice circle"]),
        ("u5", "Dev Malhotra", "@devbuilds", "Python developer", "Hyderabad, India", "Python, automation and data basics. Want to learn photography and improve my visual eye.", "DM", "gold", ["Python", "Data Visualization"], ["Photography", "Video Editing"], "Intermediate", 4.8, 16, ["Weekday evenings", "Saturday morning"], "Online", ["Technology", "Photography", "Startups"], True, ["Expense classifier"]),
        ("u6", "Zoya Khan", "@zoyacreates", "Illustrator", "Mumbai, India", "Illustration, visual design and creative thinking. Looking for help with React and web basics.", "ZK", "pink", ["Illustration", "Graphic Design"], ["React", "Java"], "Advanced", 5.0, 9, ["Saturday morning", "Sunday afternoon"], "Both", ["Design", "Technology", "Creative Arts"], True, ["Children’s book illustrations"]),
        ("u7", "Ishaan Verma", "@ishaanmusic", "Music producer", "Delhi, India", "I can teach guitar and music production. I would love to learn web development.", "IV", "lavender", ["Guitar", "Music Production"], ["React", "Java"], "Intermediate", 4.6, 7, ["Weekday evenings", "Sunday afternoon"], "Online", ["Music", "Technology", "Creative Arts"], False, ["Indie EP"]),
    ]
    people = []
    for row in raw_people:
        (pid, name, handle, role, location, bio, avatar, color, teaches, learns,
         level, rating, sessions, availability, fmt, interests, verified, projects) = row
        people.append({"id": pid, "name": name, "handle": handle, "role": role,
                       "location": location, "bio": bio, "avatar": avatar, "color": color,
                       "teaches": teaches, "learns": learns, "level": level, "rating": rating,
                       "sessions": sessions, "availability": availability, "format": fmt,
                       "interests": interests, "verified": verified, "projects": projects})
    return {
        "me": me,
        "people": people,
        "bookings": [
            {"id": "b1", "personId": "u2", "skill": "Graphic Design", "time": "Saturday morning", "status": "Confirmed", "date": "Nov 22"},
            {"id": "b2", "personId": "u5", "skill": "Python", "time": "Sunday afternoon", "status": "Pending", "date": "Nov 23"},
        ],
        "reviews": [],
    }


@contextmanager
def connection():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connection() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")
        row = conn.execute("SELECT id FROM app_state WHERE id = 1").fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)",
                (json.dumps(seed_state()), datetime.now(timezone.utc).isoformat()),
            )


@app.on_event("startup")
def startup() -> None:
    init_db()


def read_state() -> dict[str, Any]:
    with connection() as conn:
        row = conn.execute("SELECT payload FROM app_state WHERE id = 1").fetchone()
        if row is None:
            return seed_state()
        return json.loads(row["payload"])


def write_state(state: dict[str, Any]) -> dict[str, Any]:
    with connection() as conn:
        conn.execute(
            "INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
            (json.dumps(state), datetime.now(timezone.utc).isoformat()),
        )
    return state


class StatePayload(BaseModel):
    me: dict[str, Any]
    people: list[dict[str, Any]] = Field(default_factory=list)
    bookings: list[dict[str, Any]] = Field(default_factory=list)
    reviews: list[dict[str, Any]] = Field(default_factory=list)


class BookingCreate(BaseModel):
    personId: str
    skill: str = Field(min_length=1, max_length=100)
    time: str = Field(min_length=1, max_length=100)
    date: str = "To be confirmed"


class BookingUpdate(BaseModel):
    status: str


class ReviewCreate(BaseModel):
    personId: str
    rating: int = Field(ge=1, le=5)
    note: str = Field(default="", max_length=1000)


def norm(value: str) -> str:
    return " ".join(value.casefold().strip().split())


def overlap(a: list[str], b: list[str]) -> list[str]:
    bset = set(b)
    return [item for item in a if item in bset]


def direct_match(me: dict[str, Any], other: dict[str, Any]) -> dict[str, Any] | None:
    if me.get("id") == other.get("id"):
        return None
    me_learns = {norm(x) for x in me.get("learns", [])}
    other_learns = {norm(x) for x in other.get("learns", [])}
    they_teach_me = [s for s in other.get("teaches", []) if norm(s) in me_learns]
    i_teach_them = [s for s in me.get("teaches", []) if norm(s) in other_learns]
    if not they_teach_me or not i_teach_them:
        return None
    times = overlap(me.get("availability", []), other.get("availability", []))
    shared = overlap(me.get("interests", []), other.get("interests", []))
    same_format = (me.get("format") == other.get("format") or
                   me.get("format") == "Both" or other.get("format") == "Both")
    score = min(99, round(48 + min(18, (len(they_teach_me) + len(i_teach_them) - 2) * 7)
                          + min(15, len(times) * 5) + min(8, len(shared) * 4)
                          + (8 if same_format else 0) + (2 if other.get("verified") else 0)))
    first = str(other.get("name", "Partner")).split(" ")[0]
    reasons = [f"{first} can teach you {', '.join(they_teach_me)}",
               f"You can teach {first} {', '.join(i_teach_them)}",
               f"{len(times)} shared availability window(s)" if times else "Flexible scheduling needed",
               f"Both prefer {str(me.get('format', 'flexible')).lower()} sessions" if same_format else "Different session preferences"]
    return {"person": other, "score": score, "reasons": reasons, "type": "direct"}


def skill_chains(me: dict[str, Any], people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for b in people:
        if b.get("id") == me.get("id"):
            continue
        a_to_b = next((s for s in me.get("teaches", []) if norm(s) in {norm(x) for x in b.get("learns", [])}), None)
        if not a_to_b:
            continue
        for c in people:
            if c.get("id") in (me.get("id"), b.get("id")):
                continue
            b_to_c = next((s for s in b.get("teaches", []) if norm(s) in {norm(x) for x in c.get("learns", [])}), None)
            c_to_a = next((s for s in c.get("teaches", []) if norm(s) in {norm(x) for x in me.get("learns", [])}), None)
            if b_to_c and c_to_a:
                shared = (len(overlap(me.get("availability", []), b.get("availability", [])))
                          + len(overlap(b.get("availability", []), c.get("availability", [])))
                          + len(overlap(c.get("availability", []), me.get("availability", []))))
                score = min(98, 76 + shared * 4 + (4 if b.get("verified") and c.get("verified") else 0))
                result.append({"people": [b, c], "skills": [a_to_b, b_to_c, c_to_a], "score": score})
    return result[:4]


@app.get("/")
def root():
    return {"name": "SkillSphere API", "status": "running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "skillsphere-api", "database": "sqlite"}


@app.get("/api/state")
def get_state():
    return read_state()


@app.put("/api/state")
def put_state(payload: StatePayload):
    return write_state(payload.model_dump())


@app.get("/api/profiles")
def get_profiles():
    state = read_state()
    return [state["me"], *state["people"]]


@app.get("/api/profiles/{profile_id}")
def get_profile(profile_id: str):
    state = read_state()
    profile = state["me"] if profile_id == "me" else next((p for p in state["people"] if p.get("id") == profile_id), None)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.put("/api/profiles/{profile_id}")
def update_profile(profile_id: str, profile: dict[str, Any]):
    state = read_state()
    if profile_id == "me":
        state["me"] = {**state["me"], **profile, "id": "me"}
    else:
        found = False
        for index, item in enumerate(state["people"]):
            if item.get("id") == profile_id:
                state["people"][index] = {**item, **profile, "id": profile_id}
                found = True
                break
        if not found:
            raise HTTPException(status_code=404, detail="Profile not found")
    write_state(state)
    return state["me"] if profile_id == "me" else next(p for p in state["people"] if p["id"] == profile_id)


@app.get("/api/matches")
def get_matches(profile_id: str = "me"):
    state = read_state()
    me = state["me"] if profile_id == "me" else next((p for p in state["people"] if p.get("id") == profile_id), None)
    if me is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    matches = [m for p in state["people"] if (m := direct_match(me, p)) is not None]
    return sorted(matches, key=lambda item: item["score"], reverse=True)


@app.get("/api/skill-chains")
def get_skill_chains(profile_id: str = "me"):
    state = read_state()
    me = state["me"] if profile_id == "me" else next((p for p in state["people"] if p.get("id") == profile_id), None)
    if me is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return skill_chains(me, state["people"])


@app.get("/api/bookings")
def get_bookings():
    return read_state()["bookings"]


@app.post("/api/bookings", status_code=201)
def create_booking(payload: BookingCreate):
    state = read_state()
    if not any(p.get("id") == payload.personId for p in state["people"]):
        raise HTTPException(status_code=404, detail="Community member not found")
    booking = {"id": str(uuid.uuid4()), **payload.model_dump(), "status": "Pending"}
    state["bookings"].insert(0, booking)
    write_state(state)
    return booking


@app.patch("/api/bookings/{booking_id}")
def update_booking(booking_id: str, payload: BookingUpdate):
    if payload.status not in {"Pending", "Confirmed", "Completed"}:
        raise HTTPException(status_code=422, detail="Invalid booking status")
    state = read_state()
    booking = next((b for b in state["bookings"] if b.get("id") == booking_id), None)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking["status"] = payload.status
    write_state(state)
    return booking


@app.get("/api/reviews")
def get_reviews():
    return read_state()["reviews"]


@app.post("/api/reviews", status_code=201)
def create_review(payload: ReviewCreate):
    state = read_state()
    review = {"id": str(uuid.uuid4()), **payload.model_dump()}
    state["reviews"].append(review)
    write_state(state)
    return review


@app.get("/api/progress")
def get_progress():
    state = read_state()
    bookings = state["bookings"]
    return {
        "total_sessions": len(bookings),
        "completed_sessions": sum(1 for b in bookings if b.get("status") == "Completed"),
        "pending_sessions": sum(1 for b in bookings if b.get("status") == "Pending"),
        "skills_teaching": len(state["me"].get("teaches", [])),
        "skills_learning": len(state["me"].get("learns", [])),
        "reviews_received": len(state["reviews"]),
    }
