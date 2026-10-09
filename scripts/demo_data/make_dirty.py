#!/usr/bin/env python3
"""Seeded generator for the DataCrew demo dataset. SYNTHETIC DATA ONLY (Faker). Reproducible: same seed -> same file.

Usage: python scripts/demo_data/make_dirty.py [--rows 2000] [--seed 42] [--out data/demo/dirty_customers.csv]
"""
from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

from faker import Faker

HEADERS = ["Cust ID", "Full Name", "E-mail", "ph no", "City ", "Signup Date", "Amt (INR)", "Status", "Salary", "Aadhaar No", "Notes"]
CITIES = {
    "Hyderabad": ["Hyd", "hyderabad ", "HYDERABAD", "Hydrabad", " Hyderabad"],
    "Warangal": ["warangal", "Warangal ", "WARANGAL", "Warangle"],
    "Hanamkonda": ["hanamkonda", "Hanamkonda ", "Hanumakonda"],
    "Pune": ["pune", "PUNE ", "Pune "],
    "Bengaluru": ["Bangalore", "bengaluru", "BENGALURU ", "Bengalore"],
}
STATUSES = {"Paid": ["paid", "PAID ", "Paid "], "Pending": ["pending", "Pending ", "PENDING"], "Overdue": ["overdue", "Overdue ", "OVERDUE"]}
NULLS = ["", "N/A", "-", "null", "NA"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
NOTES = ["called twice", "prefers whatsapp", "gst invoice requested", "follow up next week", "", "", "", ""]


def fmt_date(d, rnd: random.Random) -> str:
    k = rnd.randrange(5)
    if k == 0: return d.strftime("%Y-%m-%d")
    if k == 1: return d.strftime("%d/%m/%Y")
    if k == 2: return d.strftime("%d-%m-%Y")
    if k == 3: return f"{d.day:02d} {MONTHS[d.month - 1]} {d.year}"
    return d.strftime("%d.%m.%Y")


def fmt_phone(p: str, rnd: random.Random) -> str:
    k = rnd.randrange(5)
    if k == 0: return p
    if k == 1: return f"+91 {p[:5]} {p[5:]}"
    if k == 2: return f"{p[:5]}-{p[5:]}"
    if k == 3: return "0" + p
    return f"91{p}"


def fmt_amount(a: float, rnd: random.Random) -> str:
    k = rnd.randrange(4)
    if k == 0: return f"{a:.2f}"
    if k == 1: return f"₹ {a:,.0f}"
    if k == 2: return f"Rs.{a:,.2f}"
    return f"{a:.0f}"


def make(rows: int, seed: int) -> list[list[str]]:
    rnd = random.Random(seed)
    fake = Faker("en_IN")
    Faker.seed(seed)
    base: list[list[str]] = []
    city_names = list(CITIES)
    for i in range(rows):
        first, last = fake.first_name(), fake.last_name()
        name = f"{first} {last}"
        email = f"{first}.{last}{rnd.randrange(10, 99)}@example.com".lower()
        phone = rnd.choice("6789") + "".join(rnd.choice("0123456789") for _ in range(9))
        city = rnd.choices(city_names, weights=[5, 3, 2, 2, 3])[0]
        d = fake.date_between(start_date="-2y", end_date="today")
        amount = round(rnd.lognormvariate(10.0, 0.45), 2)
        status = rnd.choices(list(STATUSES), weights=[6, 2, 2])[0]
        if city == "Warangal" and rnd.random() < 0.25:
            status = "Overdue"  # planted insight for the Strategist
        salary = round(rnd.gauss(52000, 12000), 0)
        aadhaar = " ".join("".join(rnd.choice("0123456789") for _ in range(4)) for _ in range(3))
        base.append([f"C{1000 + i}", name, email, phone, city, d, amount, status, salary, aadhaar, rnd.choice(NOTES)])

    out: list[list[str]] = []
    for r in base:
        cid, name, email, phone, city, d, amount, status, salary, aadhaar, note = r
        # messy categorical values
        if rnd.random() < 0.55: city = rnd.choice(CITIES[city])
        if rnd.random() < 0.40: status = rnd.choice(STATUSES[status])
        # name / email mess
        if rnd.random() < 0.08: name = name.upper()
        elif rnd.random() < 0.06: name = name.lower()
        if rnd.random() < 0.06: name = "  " + name + " "
        if rnd.random() < 0.20: email = email.upper() if rnd.random() < 0.5 else " " + email + " "
        if rnd.random() < 0.09: email = email.replace("@", "")  # invalid
        # phone
        phone_s = fmt_phone(phone, rnd)
        if rnd.random() < 0.13: phone_s = phone[:9]  # invalid (9 digits)
        # amount, salary
        amount_s = fmt_amount(amount, rnd)
        if rnd.random() < 0.04: amount_s = f"{amount * rnd.choice([40, 60, 80]):.2f}"  # outliers
        salary_s = f"{salary:.0f}"
        if rnd.random() < 0.16: salary_s = phone  # phone number typed into the salary column
        # missing values (10-14%)
        cells = {"email": email, "phone": phone_s, "city": city, "amount": amount_s, "status": status, "salary": salary_s, "name": name}
        for key, p in (("email", .12), ("phone", .15), ("city", .26), ("amount", .30), ("status", .24), ("salary", .30), ("name", .04)):
            if rnd.random() < p: cells[key] = rnd.choice(NULLS)
        if rnd.random() < 0.15: cid = cid.lower() if rnd.random() < 0.5 else " " + cid + " "
        k = rnd.random()
        if k < 0.25: aadhaar = aadhaar.replace(" ", "")
        elif k < 0.40: aadhaar = aadhaar.replace(" ", "-")
        out.append([cid, cells["name"], cells["email"], cells["phone"], cells["city"], fmt_date(d, rnd), cells["amount"], cells["status"], cells["salary"], aadhaar, note])

    # test entries
    for j in range(max(3, rows // 70)):
        out.insert(rnd.randrange(len(out)), [f"TEST{j}", "Test User", "test@test.com", "9999999999", "Hyderabad", "2025-01-01", "1", "Paid", "0", "111122223333", "test entry"])
    # exact duplicates (~8%) and near-duplicates (~3%: 'Last, First' + messy email)
    for _ in range(int(rows * 0.12)):
        out.insert(rnd.randrange(len(out)), list(rnd.choice(out)))
    for _ in range(int(rows * 0.03)):
        src = list(rnd.choice(out))
        parts = src[1].strip().split(" ", 1)
        if len(parts) == 2 and src[1].strip():
            src[1] = f"{parts[1]}, {parts[0]}"
            src[2] = " " + src[2].strip().upper() + " "
        out.insert(rnd.randrange(len(out)), src)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", type=int, default=2000)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default=str(Path(__file__).resolve().parents[2] / "data" / "demo" / "dirty_customers.csv"))
    a = ap.parse_args()
    rows = make(a.rows, a.seed)
    p = Path(a.out)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(HEADERS)
        w.writerows([[str(c) for c in r] for r in rows])
    print(f"wrote {len(rows)} rows -> {p}")


if __name__ == "__main__":
    main()
