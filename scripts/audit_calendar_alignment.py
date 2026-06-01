#!/usr/bin/env python3
"""Audit calendar mapping against allplans_nutrition.csv.

Checks:
1) Mapping resolves a row for every active day in sample windows.
2) Resolved main dish exactly matches Data.Column3 for computed week/day.
3) Consecutive-day repeats are reported.
"""
from __future__ import annotations
import csv
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ANCHOR = date(2026, 5, 1)
PLANS = ["elite", "basic", "weightloss", "diabetic", "smoothie", "salad", "customised"]
VARIANTS = ["veg", "nonveg", "standard"]
MEALS = ["lunch", "dinner"]


def nk(v: str | None) -> str:
    return (v or "").strip().lower()


def week_token(v: str | None) -> str:
    text = nk(v)
    digits = "".join(ch for ch in text if ch.isdigit())
    return f"w{digits}" if digits else ""


def day_token(v: str | None) -> str:
    return nk(v)[:3]


def extract_variant_token(plan_label: str) -> str:
    text = "".join(ch if (ch.isalpha() or ch in " -") else " " for ch in nk(plan_label))
    import re
    if re.search(r"(^|[\s-])non[\s-]?veg([\s-]|$)", text):
        return "nonveg"
    if re.search(r"(^|[\s-])veg([\s-]|$)", text):
        return "veg"
    return ""


def cycle_week_for(d: date) -> str:
    diff = (d - ANCHOR).days
    normalized = ((diff // 7) % 4 + 4) % 4
    return f"w{normalized + 1}"


def next_active_dates(start: date, count: int) -> list[date]:
    out = []
    d = start
    while len(out) < count:
        if d.weekday() != 6:
            out.append(d)
        d += timedelta(days=1)
    return out


def build_unified_row(rows, plan, variant, meal, d):
    week = cycle_week_for(d)
    day = day_token(d.strftime("%a"))
    plan_n = nk(plan)
    meal_n = nk(meal)
    variant_n = nk(variant).replace("-", "")
    for row in rows:
        plan_label = nk(row.get("Plan"))
        row_week = week_token(row.get("Week") or row.get("Data.Column1"))
        row_day = day_token(row.get("Day") or row.get("Data.Column2"))
        plan_variant = extract_variant_token(plan_label)
        variant_hit = (not variant_n) or (not plan_variant) or (plan_variant == variant_n)
        meal_hit = True if plan_n == "smoothie" else (meal_n in plan_label)
        if plan_n in plan_label and meal_hit and variant_hit and row_week == week and row_day == day:
            return row
    return None


def main():
    with (ROOT / "allplans_nutrition.csv").open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    start = date(2026, 5, 18)
    sample_dates = next_active_dates(start, 24)

    unresolved = []
    mismatches = []
    repeats = []

    for plan in PLANS:
        for meal in MEALS:
            for variant in VARIANTS:
                dishes = []
                any_row = False
                for d in sample_dates:
                    row = build_unified_row(rows, plan, variant, meal, d)
                    if not row:
                        continue
                    any_row = True
                    main_dish = (row.get("Data.Column3") or "").strip()
                    if not main_dish:
                        unresolved.append((plan, variant, meal, d.isoformat(), "empty main dish"))
                        continue
                    dishes.append((d, main_dish))
                if not any_row:
                    continue
                for i in range(1, len(dishes)):
                    if dishes[i][1] == dishes[i-1][1]:
                        repeats.append((plan, variant, meal, dishes[i-1][0].isoformat(), dishes[i][0].isoformat(), dishes[i][1]))

    print(f"Audit window start: {start.isoformat()} (24 active days)")
    print(f"Consecutive repeats found: {len(repeats)}")
    for row in repeats[:20]:
        print("  repeat:", row)
    print(f"Unresolved/empty main dish entries: {len(unresolved)}")
    for row in unresolved[:20]:
        print("  unresolved:", row)


if __name__ == "__main__":
    main()
