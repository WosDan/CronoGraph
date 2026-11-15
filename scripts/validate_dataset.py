"""CLI script to validate any CronoGraph academic JSON dataset."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.dataset_service import validate_academic_dataset


def main() -> None:
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT_DIR / "DB" / "simulacion_academica.json"
    if not target.exists():
        raise SystemExit(f"Archivo no encontrado: {target}")

    with target.open("r", encoding="utf-8") as fh:
        raw = json.load(fh)

    _, report = validate_academic_dataset(raw)
    print(f"Validación de {target}: valid={report.valid}")
    if report.summary:
        print(f"Resumen: {report.summary.model_dump()}")
    for issue in report.issues:
        print(f"  [{issue.severity.upper()}] {issue.code} ({issue.entity_id or '-'}): {issue.message}")

    if not report.valid:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
