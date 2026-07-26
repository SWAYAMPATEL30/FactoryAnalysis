"""Stage 7 -- Excel Generation.

Copies the real target template (never rebuilds it) and writes one row per
MostRow into 'MOST Analysis'. Formula columns (Q, S, W, AC) are written as
live Excel formulas -- translated per-row from the template's own formula
text -- so the workbook keeps recalculating if a reviewer edits a cell by
hand in Stage 8. Only the taxonomy-bucket columns (Y/Z/AA/AB) intentionally
use a classification-name lookup instead of the template's numeric-ref-range
IF()s.

Applies comprehensive, publication-grade Excel formatting across all sheets:
  1. Dynamic auto-fit column widths to prevent truncation/bleed.
  2. Disambiguated, clear single-line header row on every sheet.
  3. Visual section header banners (Row 4 on MOST Analysis).
  4. Universal gridlines and freeze panes across all sheets.
  5. Right-aligned numeric columns with explicit formatting (0.00"s", 0.0%, #,##0).
  6. Category conditional formatting (VA=green, SVA=yellow, NVA=red, NVA-N=purple)
     and low-confidence warning highlights (<0.85 orange).
  7. Native OpenPyXL Charts (Pie Chart & Bar Chart on Summary, Gantt on Timeline, Pie on Executive Summary).
  8. Executive Summary cover sheet as the very first tab.
"""
from __future__ import annotations

import math
import shutil
from pathlib import Path
from datetime import datetime

from openpyxl import load_workbook
from openpyxl.formula.translate import Translator
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.formatting.rule import FormulaRule, CellIsRule
from openpyxl.chart import PieChart, BarChart, Reference
from openpyxl.utils import get_column_letter

from app.config.most_tables import load_most_tables
from app.models.schemas import MostRow

SHEET_NAME = "MOST Analysis"
FIRST_DATA_ROW = 6
MAX_CLEAR_COL = 40  # Columns A to AN (1 to 40)

# Disambiguated Header Labels for Row 5
EXPLICIT_HEADERS = {
    "A": "S.No",
    "B": "Station No",
    "C": "Activity No",
    "D": "Activity Description",
    "E": "Data Card",
    "F": "Col 1",
    "G": "Col 2",
    "H": "Col 3",
    "I": "Col 4",
    "J": "Col 5",
    "K": "Col 6",
    "L": "Col 7",
    "M": "Col 8",
    "N": "Col 9",
    "O": "Col 10",
    "P": "Col 11",
    "Q": "Sequence Index String",
    "R": "Frequency",
    "S": "Total TMU",
    "T": "Elemental Description (MOST)",
    "U": "Operator",
    "V": "Muda Ref",
    "W": "Total Duration (s)",
    "X": "Work Mode",
    "Y": "VA Time (s)",
    "Z": "NVA-N Time (s)",
    "AA": "SVA Time (s)",
    "AB": "NVA Time (s)",
    "AC": "Taxonomy Category",
    "AD": "Source Video",
    "AE": "Segment Start (s)",
    "AF": "Segment End (s)",
    "AG": "Segmentation Model",
    "AH": "Classification Model",
    "AI": "Confidence Score",
    "AJ": "Human Reviewed",
    "AK": "Activity & Movement Details",
    "AL": "Activity Duration (sec)",
    "AM": "Activity Timeline",
    "AN": "Elemental Description (Gemini)",
}

# Standard Reusable Styles
FONT_HEADER_LARGE = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
FONT_HEADER_MED = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
FONT_SECTION_HEADER = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
FONT_BOLD_DARK = Font(name="Calibri", size=11, bold=True, color="1F4E79")
FONT_MUTED = Font(name="Calibri", size=10, color="57636B")

FILL_NAVY_DARK = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
FILL_NAVY_MED = PatternFill(start_color="2F5597", end_color="2F5597", fill_type="solid")
FILL_TEAL_DARK = PatternFill(start_color="005B60", end_color="005B60", fill_type="solid")
FILL_SLATE_DARK = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
FILL_SECTION_BG = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")

BORDER_THIN = Border(
    left=Side(style="thin", color="D9D9D9"),
    right=Side(style="thin", color="D9D9D9"),
    top=Side(style="thin", color="D9D9D9"),
    bottom=Side(style="thin", color="D9D9D9"),
)
BORDER_HEADER = Border(
    left=Side(style="thin", color="FFFFFF"),
    right=Side(style="thin", color="FFFFFF"),
    top=Side(style="medium", color="1F4E79"),
    bottom=Side(style="medium", color="1F4E79"),
)


def _autofit_columns(ws, min_col: int = 1, max_col: int = None, start_row: int = 1, max_width_cap: int = 50) -> None:
    """Calculates column widths based on maximum string length in each column, enforcing minimum bounds."""
    if max_col is None:
        max_col = ws.max_column

    for c in range(min_col, max_col + 1):
        col_letter = get_column_letter(c)
        max_len = 0
        for r in range(start_row, ws.max_row + 1):
            val = ws.cell(row=r, column=c).value
            if val is not None:
                # Ignore raw formula strings when computing visual width
                val_str = str(val)
                if val_str.startswith("="):
                    val_str = "000.00s"
                lines = val_str.split("\n")
                for line in lines:
                    if len(line) > max_len:
                        max_len = len(line)

        # Calculate width with padding
        calculated = max(max_len + 4, 10)
        # Cap very long text columns so word wrap kicks in cleanly
        final_width = min(calculated, max_width_cap)
        ws.column_dimensions[col_letter].width = final_width


def _clear_existing_data_rows(ws) -> None:
    for r in range(FIRST_DATA_ROW, ws.max_row + 1):
        for c in range(1, MAX_CLEAR_COL + 1):
            ws[f"{get_column_letter(c)}{r}"] = None


def _write_section_and_column_headers(ws) -> None:
    """Writes Section Banners (Row 4) and Disambiguated Headers (Row 5)."""
    # 1. Section Header Banners (Row 4)
    # Note: W4 is left unmerged as it contains the template's Total Duration SUM formula (=SUM(W6:W...))
    section_headers = [
        ("A4", "D4", "IDENTIFICATION & METADATA", FILL_NAVY_DARK),
        ("E4", "P4", "MOST SEQUENCE PARAMETER MATRIX (G / A / B / P / M / X / I / T)", FILL_SLATE_DARK),
        ("Q4", "V4", "DERIVED TIMINGS & MUDA REF", FILL_NAVY_MED),
        ("X4", "AC4", "TAXONOMY CATEGORY BREAKDOWN", FILL_NAVY_MED),
        ("AD4", "AN4", "AI COMPUTER VISION & TRACEABILITY", FILL_TEAL_DARK),
    ]

    ws.row_dimensions[4].height = 24
    for start_cell, end_cell, label, fill in section_headers:
        ws.merge_cells(f"{start_cell}:{end_cell}")
        top_cell = ws[start_cell]
        top_cell.value = label
        top_cell.font = FONT_SECTION_HEADER
        top_cell.fill = fill
        top_cell.alignment = Alignment(horizontal="center", vertical="center")

    # Format W4 (Total Duration Sum Cell) nicely
    ws["W4"].font = Font(name="Calibri", size=11, bold=True, color="1F4E79")
    ws["W4"].alignment = Alignment(horizontal="right", vertical="center")
    ws["W4"].number_format = '0.00"s"'

    # 2. Row 5 Headers
    ws.row_dimensions[5].height = 32
    for col_letter, header in EXPLICIT_HEADERS.items():
        cell = ws[f"{col_letter}5"]
        cell.value = header
        cell.font = FONT_HEADER_MED
        cell.fill = FILL_NAVY_DARK
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER_HEADER


def _create_timeline_chart_sheet(wb, rows: list[MostRow]) -> None:
    """Creates dedicated 'Activity Timeline Chart' worksheet tab with Gantt chart."""
    chart_sheet_name = "Activity Timeline Chart"
    if chart_sheet_name in wb.sheetnames:
        del wb[chart_sheet_name]

    ws = wb.create_sheet(title=chart_sheet_name)
    ws.views.sheetView[0].showGridLines = True
    ws.freeze_panes = "A4"

    # Title Banner
    ws.merge_cells("A1:G1")
    title_cell = ws["A1"]
    title_cell.value = "Activity Execution Timeline & Distribution"
    title_cell.font = FONT_HEADER_LARGE
    title_cell.fill = FILL_NAVY_DARK
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 35

    # Headers (Row 3)
    headers = [
        "Activity Description",
        "Start Time (s)",
        "Duration (s)",
        "End Time (s)",
        "Category",
        "Movement State",
        "Machine State",
    ]
    ws.row_dimensions[3].height = 25
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col_num)
        cell.value = header
        cell.font = FONT_HEADER_MED
        cell.fill = FILL_NAVY_MED
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER_HEADER

    start_row = 4
    for i, r in enumerate(rows):
        row_num = start_row + i
        ws.cell(row=row_num, column=1, value=r.elemental_description)
        ws.cell(row=row_num, column=2, value=r.t_start_sec)
        ws.cell(row=row_num, column=3, value=r.activity_duration_sec)
        ws.cell(row=row_num, column=4, value=r.t_end_sec)
        ws.cell(row=row_num, column=5, value=r.category)

        # Movement/Machine states
        mov_state = "MOVE"
        mac_state = "IDLE"
        if "(" in r.activity_movement_details and ")" in r.activity_movement_details:
            mov_state = r.activity_movement_details.split("(")[1].split(")")[0]
        if "Machine:" in r.activity_movement_details:
            mac_state = r.activity_movement_details.split("Machine:")[1].strip()

        ws.cell(row=row_num, column=6, value=mov_state)
        ws.cell(row=row_num, column=7, value=mac_state)

        for col in range(1, 8):
            c = ws.cell(row=row_num, column=col)
            c.border = BORDER_THIN
            if col in (2, 3, 4):
                c.alignment = Alignment(horizontal="right", vertical="center")
                c.number_format = '0.00"s"'
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

        ws.row_dimensions[row_num].height = 22

    num_rows = len(rows)
    end_row = start_row + num_rows - 1

    # Embed Gantt Chart
    chart = BarChart()
    chart.type = "bar"
    chart.style = 10
    chart.grouping = "stacked"
    chart.overlap = 100
    chart.title = "Activity Execution Timeline (Gantt Chart)"
    chart.height = max(10, num_rows * 0.7)
    chart.width = 22

    data = Reference(ws, min_col=2, min_row=3, max_col=3, max_row=end_row)
    cats = Reference(ws, min_col=1, min_row=4, max_row=end_row)

    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.x_axis.title = "Timeline (Seconds)"
    chart.y_axis.title = "Activities"
    chart.legend = None

    ws.add_chart(chart, "I3")

    _autofit_columns(ws, min_col=1, max_col=7, start_row=3)


def _format_most_analysis_sheet(ws, num_rows: int) -> None:
    """Applies clean alignment, column widths, freeze panes, borders, and category conditional formatting."""
    ws.views.sheetView[0].showGridLines = True
    ws.freeze_panes = "E6"  # Freezes headers (1-5) AND identification columns (A-D)

    wide_cols = ["D", "T", "AK", "AM", "AN"]
    numeric_right_cols = ["S", "W", "Y", "Z", "AA", "AB", "AE", "AF", "AI", "AL"]

    if num_rows == 0:
        return

    # Format data cells
    for r in range(FIRST_DATA_ROW, FIRST_DATA_ROW + num_rows):
        max_line_len = 0
        for c in range(1, MAX_CLEAR_COL + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = BORDER_THIN
            col_letter = get_column_letter(c)

            # Alignments & Word Wrap
            if col_letter in wide_cols:
                cell.alignment = Alignment(wrap_text=True, vertical="top", horizontal="left")
                val_str = str(cell.value or "")
                if len(val_str) > max_line_len:
                    max_line_len = len(val_str)
            elif col_letter in numeric_right_cols:
                cell.alignment = Alignment(horizontal="right", vertical="top")
            elif col_letter in ["A", "B", "C", "E", "R", "U", "V", "X", "AG", "AH", "AJ"]:
                cell.alignment = Alignment(horizontal="center", vertical="top")
            else:
                cell.alignment = Alignment(vertical="top", horizontal="left")

            # Explicit Number Formatting
            if col_letter in ["S"]:  # TMU
                cell.number_format = "#,##0"
            elif col_letter in ["W", "Y", "Z", "AA", "AB", "AE", "AF", "AL"]:  # Seconds
                cell.number_format = '0.00"s"'
            elif col_letter == "AI":  # Confidence
                cell.number_format = "0.0%"
            elif col_letter == "R":  # Frequency
                cell.number_format = "0"

        # Calculate row height dynamically to accommodate wrapped text
        calculated_height = max(24, math.ceil(max_line_len / 35) * 18)
        ws.row_dimensions[r].height = min(calculated_height, 75)

    # Auto-fit column widths
    _autofit_columns(ws, min_col=1, max_col=MAX_CLEAR_COL, start_row=5, max_width_cap=45)

    # Ensure parameter matrix columns (F to P) are clearly legible
    for c in range(6, 17):
        col_letter = get_column_letter(c)
        ws.column_dimensions[col_letter].width = max(ws.column_dimensions[col_letter].width, 8)

    # Conditional Formatting for Taxonomy Categories & Low Confidence
    last_row = FIRST_DATA_ROW + num_rows - 1
    data_range = f"A{FIRST_DATA_ROW}:AN{last_row}"

    va_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
    sva_fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    nva_fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
    nvan_fill = PatternFill(start_color="E4DFEC", end_color="E4DFEC", fill_type="solid")

    ws.conditional_formatting.add(data_range, FormulaRule(formula=[f'$AC{FIRST_DATA_ROW}="VA"'], stopIfTrue=True, fill=va_fill))
    ws.conditional_formatting.add(data_range, FormulaRule(formula=[f'$AC{FIRST_DATA_ROW}="SVA"'], stopIfTrue=True, fill=sva_fill))
    ws.conditional_formatting.add(data_range, FormulaRule(formula=[f'$AC{FIRST_DATA_ROW}="NVA"'], stopIfTrue=True, fill=nva_fill))
    ws.conditional_formatting.add(data_range, FormulaRule(formula=[f'$AC{FIRST_DATA_ROW}="NVA-N"'], stopIfTrue=True, fill=nvan_fill))

    # Low Confidence (<0.85) warning fill in orange
    conf_fill = PatternFill(start_color="FFC000", end_color="FFC000", fill_type="solid")
    ws.conditional_formatting.add(
        f"AI{FIRST_DATA_ROW}:AI{last_row}",
        CellIsRule(operator="lessThan", formula=["0.85"], stopIfTrue=True, fill=conf_fill),
    )


def _format_summary_sheet(wb) -> None:
    """Formats 'VA SVA NVA Summary' tab and embeds native OpenPyXL Pie and Bar charts."""
    if "VA SVA NVA Summary" not in wb.sheetnames:
        return

    ws = wb["VA SVA NVA Summary"]
    ws.views.sheetView[0].showGridLines = True
    ws.freeze_panes = "A2"

    # Header formatting
    ws.row_dimensions[1].height = 26
    for c in range(1, 6):
        cell = ws.cell(row=1, column=c)
        cell.font = FONT_HEADER_MED
        cell.fill = FILL_NAVY_DARK
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BORDER_HEADER

    # Data formatting
    for r in range(2, 6):
        ws.row_dimensions[r].height = 22
        for c in range(1, 6):
            cell = ws.cell(row=r, column=c)
            cell.border = BORDER_THIN
            if c in (3, 4, 5):
                cell.alignment = Alignment(horizontal="right", vertical="center")
                if c == 4:
                    cell.number_format = '0.00"s"'
                elif c == 5:
                    cell.number_format = "#,##0"
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # Native Pie Chart
    pie = PieChart()
    pie.title = "Taxonomy Time Distribution (VA / SVA / NVA)"
    pie.width = 16
    pie.height = 10
    labels = Reference(ws, min_col=2, min_row=2, max_row=5)
    data = Reference(ws, min_col=4, min_row=1, max_row=5)  # Col D has Duration in sec
    pie.add_data(data, titles_from_data=True)
    pie.set_categories(labels)
    ws.add_chart(pie, "G2")

    # Native Bar Chart
    bar = BarChart()
    bar.type = "col"
    bar.style = 10
    bar.title = "Category Duration Comparison (Seconds)"
    bar.y_axis.title = "Seconds"
    bar.x_axis.title = "Category"
    bar.width = 16
    bar.height = 10
    bar.add_data(data, titles_from_data=True)
    bar.set_categories(labels)
    bar.legend = None
    ws.add_chart(bar, "G18")

    _autofit_columns(ws, min_col=1, max_col=5, start_row=1)


def _create_executive_summary_sheet(wb, rows: list[MostRow], activity_desc: str) -> None:
    """Creates the 'Executive Summary' cover tab as the very first sheet in the workbook."""
    ws = wb.create_sheet(title="Executive Summary", index=0)
    ws.views.sheetView[0].showGridLines = True

    # Title Card Banner
    ws.merge_cells("A1:E1")
    title_cell = ws["A1"]
    title_cell.value = "MOST WORK CYCLE ANALYSIS — EXECUTIVE SUMMARY"
    title_cell.font = FONT_HEADER_LARGE
    title_cell.fill = FILL_NAVY_DARK
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 42

    # Key Metadata Block
    metadata = [
        ("Activity Description:", activity_desc, True),
        ("Analysis Date:", datetime.now().strftime("%Y-%m-%d %H:%M"), False),
        ("Operator ID / Name:", rows[0].operator if rows else "OP-1", False),
        ("Total Work Motion Segments:", len(rows), False),
    ]

    total_sec = sum(r.total_time_sec for r in rows) if rows else 0
    va_sec = sum(r.va_sec for r in rows) if rows else 0
    eff = (va_sec / total_sec * 100) if total_sec > 0 else 0

    ws["A3"] = "Activity Description:"
    ws["B3"] = activity_desc
    ws["B3"].font = Font(name="Calibri", size=11, bold=True, color="1F4E79")

    ws["A4"] = "Analysis Date:"
    ws["B4"] = datetime.now().strftime("%Y-%m-%d %H:%M")

    ws["A5"] = "Operator Name / ID:"
    ws["B5"] = rows[0].operator if rows else "OP-1"

    ws["A6"] = "Total Work Motion Segments:"
    ws["B6"] = len(rows)

    ws["A7"] = "Total Work Cycle Duration:"
    ws["B7"] = total_sec
    ws["B7"].number_format = '0.00"s"'

    ws["A8"] = "Value-Add Efficiency Score (VA %):"
    ws["B8"] = eff / 100.0
    ws["B8"].number_format = "0.0%"
    ws["B8"].font = Font(name="Calibri", size=12, bold=True, color="1A9A52" if eff > 50 else "C8452C")

    for r in range(3, 9):
        ws[f"A{r}"].font = FONT_MUTED
        ws[f"A{r}"].alignment = Alignment(horizontal="right")
        ws.row_dimensions[r].height = 22

    # Executive Breakdown Table (Rows 11-16)
    ws.merge_cells("A11:D11")
    t_head = ws["A11"]
    t_head.value = "TAXONOMY BREAKDOWN SUMMARY"
    t_head.font = FONT_HEADER_MED
    t_head.fill = FILL_NAVY_MED
    t_head.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[11].height = 25

    table_headers = ["Category Code", "Classification Name", "Duration (s)", "Share (%)"]
    ws.row_dimensions[12].height = 22
    for c_idx, h in enumerate(table_headers, 1):
        cell = ws.cell(row=12, column=c_idx)
        cell.value = h
        cell.font = Font(name="Calibri", size=10, bold=True, color="1F4E79")
        cell.fill = FILL_SECTION_BG
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BORDER_THIN

    # Compute category sums
    cats = [
        ("VA", "Value Added Work", sum(r.va_sec for r in rows)),
        ("SVA", "Semi-Value Added Work", sum(r.sva_sec for r in rows)),
        ("NVA-N", "Non-Value Added (Necessary)", sum(r.nvan_sec for r in rows)),
        ("NVA", "Non-Value Added (Waste)", sum(r.nva_sec for r in rows)),
    ]

    for idx, (code, name, sec) in enumerate(cats, 13):
        ws.row_dimensions[idx].height = 20
        share = (sec / total_sec) if total_sec > 0 else 0
        ws.cell(row=idx, column=1, value=code).alignment = Alignment(horizontal="center")
        ws.cell(row=idx, column=2, value=name).alignment = Alignment(horizontal="left")

        c_sec = ws.cell(row=idx, column=3, value=sec)
        c_sec.alignment = Alignment(horizontal="right")
        c_sec.number_format = '0.00"s"'

        c_sh = ws.cell(row=idx, column=4, value=share)
        c_sh.alignment = Alignment(horizontal="right")
        c_sh.number_format = "0.0%"

        for c in range(1, 5):
            ws.cell(row=idx, column=c).border = BORDER_THIN

    # Embed Executive Pie Chart
    summary_ws = wb["VA SVA NVA Summary"]
    chart = PieChart()
    chart.title = "Value Distribution Breakdown"
    labels = Reference(summary_ws, min_col=2, min_row=2, max_row=5)
    data = Reference(summary_ws, min_col=4, min_row=1, max_row=5)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(labels)
    chart.width = 16
    chart.height = 11
    ws.add_chart(chart, "F3")

    _autofit_columns(ws, min_col=1, max_col=4, start_row=3)


def write_most_analysis_workbook(
    rows: list[MostRow],
    template_path: Path,
    output_path: Path,
    activity_description: str,
) -> Path:
    if not rows:
        raise ValueError("no rows to write")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copyfile(template_path, output_path)
    except PermissionError:
        import time

        output_path = output_path.with_name(f"{output_path.stem}_{int(time.time())}{output_path.suffix}")
        shutil.copyfile(template_path, output_path)

    wb = load_workbook(output_path)
    ws = wb[SHEET_NAME]

    _clear_existing_data_rows(ws)
    _write_section_and_column_headers(ws)

    tables = load_most_tables()
    q_template = '=IF(E6=$E$1,($F$1&F6&$G$1&G6&$H$1&H6&$I$1&I6&$J$1&J6&$K$1&K6&$L$1&L6),IF(E6=$E$2,($F$2&F6&$G$2&G6&$H$2&H6&$I$2&I6&$J$2&J6&$K$2&K6&$L$2&L6),IF(E6=$E$3,($F$3&F6&$G$3&G6&$H$3&H6&$I$3&I6&$J$3&J6&$K$3&K6&$L$3&L6&$M$3&M6&$N$3&N6&$O$3&O6&$P$3&P6),IF(E6=$E$4,F6&"SEC"))))'
    s_template = "=IF(E6=$E$4,R6*F6/0.036,(SUM(F6:P6)*10*R6))"
    ac_template = "=VLOOKUP(V6,'VA SVA NVA Summary'!A:E,3,0)"

    for i, row in enumerate(rows):
        r = FIRST_DATA_ROW + i
        model = tables.sequence_models[row.data_card]

        ws[f"A{r}"] = row.s_no
        ws[f"B{r}"] = row.station_no
        ws[f"C{r}"] = row.activity_no
        ws[f"D{r}"] = activity_description
        ws[f"E{r}"] = row.data_card
        for col, value in zip(model.columns, row.param_values):
            ws[f"{col}{r}"] = value

        ws[f"Q{r}"] = Translator(q_template, origin="Q6").translate_formula(f"Q{r}")
        ws[f"R{r}"] = row.freq
        ws[f"S{r}"] = Translator(s_template, origin="S6").translate_formula(f"S{r}")
        ws[f"T{r}"] = row.elemental_description
        ws[f"U{r}"] = row.operator
        ws[f"V{r}"] = row.muda_ref
        ws[f"W{r}"] = f"=S{r}*0.036"
        ws[f"X{r}"] = row.online_offline_mode

        classification_lookup = f"VLOOKUP(V{r},'VA SVA NVA Summary'!$A:$E,2,0)"
        ws[f"Y{r}"] = f'=IF({classification_lookup}="VA",W{r},0)'
        ws[f"Z{r}"] = f'=IF({classification_lookup}="NVA-N",W{r},0)'
        ws[f"AA{r}"] = f'=IF({classification_lookup}="SVA",W{r},0)'
        ws[f"AB{r}"] = f'=IF({classification_lookup}="NVA",W{r},0)'
        ws[f"AC{r}"] = Translator(ac_template, origin="AC6").translate_formula(f"AC{r}")

        ws[f"AD{r}"] = row.source_video_uri
        ws[f"AE{r}"] = row.t_start_sec
        ws[f"AF{r}"] = row.t_end_sec
        ws[f"AG{r}"] = row.segment_model_version
        ws[f"AH{r}"] = row.classification_model_version
        ws[f"AI{r}"] = row.confidence
        ws[f"AJ{r}"] = "YES" if row.human_corrected else "NO"
        ws[f"AK{r}"] = row.activity_movement_details
        ws[f"AL{r}"] = row.activity_duration_sec
        ws[f"AM{r}"] = row.activity_timeline
        ws[f"AN{r}"] = row.uppercase_elemental_description

    last_row = FIRST_DATA_ROW + len(rows) - 1
    ws["D6"] = activity_description
    ws["W4"] = f"=SUM(W{FIRST_DATA_ROW}:W{last_row})"

    # Format MOST Analysis sheet
    _format_most_analysis_sheet(ws, len(rows))

    # Format Summary sheet & add native Pie + Bar charts
    _format_summary_sheet(wb)

    # Generate dedicated Activity Timeline Chart worksheet tab
    _create_timeline_chart_sheet(wb, rows)

    # Generate Executive Summary cover tab (first tab)
    _create_executive_summary_sheet(wb, rows, activity_description)

    # Ensure Executive Summary is active sheet upon opening
    wb.active = 0

    wb.save(output_path)
    return output_path
