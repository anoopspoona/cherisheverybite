#!/usr/bin/env python3
"""Validate runtime CSV contracts for Cherish Every Bite.

Checks:
1) Required runtime files exist.
2) Required columns exist.
3) Key relationships:
   - menu.csv Dish_ID must exist in prices.csv Dish_ID
   - live plans should have nutrition coverage in allplans_nutrition.csv
4) Basic status sanity for plans/prices where applicable.

Exit code: 0 on success, 1 on validation failures.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent


@dataclass
class ValidationResult:
    errors: list[str]
    warnings: list[str]

    def add_error(self, message: str) -> None:
        self.errors.append(message)

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = reader.fieldnames or []
        rows = [dict(row) for row in reader]
    return headers, rows


def require_columns(result: ValidationResult, file_label: str, headers: Iterable[str], required: set[str]) -> None:
    header_set = set(headers)
    missing = sorted(required - header_set)
    if missing:
        result.add_error(f"{file_label}: missing required columns: {', '.join(missing)}")


def normalize(value: str | None) -> str:
    return (value or "").strip()

def normalize_key(value: str | None) -> str:
    return normalize(value).lower()


def validate() -> ValidationResult:
    result = ValidationResult(errors=[], warnings=[])

    contracts: dict[str, set[str]] = {
        "menu.csv": {"Dish_ID", "Dish_Name", "Category"},
        "prices.csv": {"Dish_ID", "Price"},
        "plans.csv": {"Plan_Key", "Variant_Key", "Plan_Name", "Status"},
        "customization_options.csv": {"Category", "Option_Name"},
    }

    loaded: dict[str, tuple[list[str], list[dict[str, str]]]] = {}

    for filename, required_columns in contracts.items():
        path = ROOT / filename
        if not path.exists():
            result.add_error(f"Missing required runtime file: {filename}")
            continue

        headers, rows = read_csv(path)
        loaded[filename] = (headers, rows)
        require_columns(result, filename, headers, required_columns)

        if not rows:
            result.add_warning(f"{filename}: file is present but has no data rows")

    if result.errors:
        return result

    _, menu_rows = loaded["menu.csv"]
    _, price_rows = loaded["prices.csv"]
    _, plan_rows = loaded["plans.csv"]

    price_ids = {normalize(row.get("Dish_ID")) for row in price_rows if normalize(row.get("Dish_ID"))}
    missing_price_ids = sorted(
        {
            normalize(row.get("Dish_ID"))
            for row in menu_rows
            if normalize(row.get("Dish_ID")) and normalize(row.get("Dish_ID")) not in price_ids
        }
    )
    if missing_price_ids:
        preview = ", ".join(missing_price_ids[:10])
        suffix = " ..." if len(missing_price_ids) > 10 else ""
        result.add_error(
            f"menu.csv -> prices.csv integrity: {len(missing_price_ids)} Dish_ID values missing in prices.csv: {preview}{suffix}"
        )

    live_plan_pairs = {
        (normalize_key(row.get("Plan_Key")), normalize_key(row.get("Variant_Key")))
        for row in plan_rows
        if normalize_key(row.get("Status")) == "live"
    }
    nutrition_path = ROOT / "allplans_nutrition.csv"
    if nutrition_path.exists():
        _, nutrition_rows = read_csv(nutrition_path)
        nutrition_plan_labels = [normalize_key(row.get("Plan") or row.get("plan")) for row in nutrition_rows]
        nutrition_gaps: list[tuple[str, str]] = []
        for plan_key, variant_key in sorted(live_plan_pairs):
            variant_tokens = {variant_key}
            if variant_key == "nonveg":
                variant_tokens.add("non-veg")
            has_coverage = any(
                plan_key in label and any(token in label for token in variant_tokens)
                for label in nutrition_plan_labels
            )
            if not has_coverage:
                nutrition_gaps.append((plan_key, variant_key))
        if nutrition_gaps:
            preview = ", ".join([f"{p[0]}:{p[1]}" for p in nutrition_gaps[:10]])
            suffix = " ..." if len(nutrition_gaps) > 10 else ""
            result.add_warning(
                "plans.csv -> allplans_nutrition.csv coverage: "
                f"{len(nutrition_gaps)} live Plan_Key/Variant_Key pairs look unmatched in nutrition sheet: {preview}{suffix}"
            )

    valid_status = {"live", "hidden", ""}
    bad_price_status = sorted(
        {
            normalize(row.get("Status"))
            for row in price_rows
            if normalize(row.get("Status")).lower() not in valid_status
        }
    )
    if bad_price_status:
        result.add_warning(f"prices.csv: unexpected Status values found: {', '.join(bad_price_status)}")

    hero_path = ROOT / "hero_slides.csv"
    if hero_path.exists():
        hero_headers, hero_rows = read_csv(hero_path)
        hero_required = {"slide_id", "title", "image_url", "status", "sort_order"}
        require_columns(result, "hero_slides.csv", hero_headers, hero_required)
        if not result.errors:
            live_hero_rows = [
                row
                for row in hero_rows
                if normalize(row.get("status")).lower() == "live" and normalize(row.get("image_url"))
            ]
            for row in live_hero_rows:
                image_path = ROOT / normalize(row.get("image_url"))
                if not image_path.exists():
                    result.add_warning(
                        f"hero_slides.csv: missing image file for slide_id={normalize(row.get('slide_id'))}: {normalize(row.get('image_url'))}"
                    )

    return result


def main() -> int:
    result = validate()

    if result.warnings:
        print("Warnings:")
        for warning in result.warnings:
            print(f"  - {warning}")

    if result.errors:
        print("Errors:")
        for err in result.errors:
            print(f"  - {err}")
        return 1

    print("✅ Data validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
