# backend/receipts_app/utils.py
"""
PDF generation utilities using ReportLab.
"""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# Brand Colors
GREEN = colors.HexColor('#3BB143')
DARK = colors.HexColor('#1A1A1A')
GRAY = colors.HexColor('#666666')
LIGHT_GRAY = colors.HexColor('#F5F5F5')
WHITE = colors.white


def _build_styles():
    styles = getSampleStyleSheet()
    custom = {
        'title': ParagraphStyle(
            'title', fontSize=22, fontName='Helvetica-Bold',
            textColor=GREEN, alignment=TA_CENTER, spaceAfter=4
        ),
        'subtitle': ParagraphStyle(
            'subtitle', fontSize=11, fontName='Helvetica',
            textColor=GRAY, alignment=TA_CENTER, spaceAfter=16
        ),
        'section_header': ParagraphStyle(
            'section_header', fontSize=10, fontName='Helvetica-Bold',
            textColor=WHITE, alignment=TA_LEFT
        ),
        'body': ParagraphStyle(
            'body', fontSize=9, fontName='Helvetica',
            textColor=DARK, leading=14
        ),
        'bold': ParagraphStyle(
            'bold', fontSize=9, fontName='Helvetica-Bold',
            textColor=DARK
        ),
        'right': ParagraphStyle(
            'right', fontSize=9, fontName='Helvetica',
            textColor=DARK, alignment=TA_RIGHT
        ),
        'footer': ParagraphStyle(
            'footer', fontSize=8, fontName='Helvetica',
            textColor=GRAY, alignment=TA_CENTER
        ),
        'amount': ParagraphStyle(
            'amount', fontSize=18, fontName='Helvetica-Bold',
            textColor=GREEN, alignment=TA_CENTER, spaceAfter=4
        ),
    }
    return custom


def generate_receipt_pdf(receipt) -> bytes:
    """Generate a single transaction receipt as PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = _build_styles()
    elements = []
    tx = receipt.transaction

    # Header
    elements.append(Paragraph("RIZIKI", styles['title']))
    elements.append(Paragraph("M-Pesa Transaction Receipt", styles['subtitle']))
    elements.append(HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=12))

    # Receipt meta
    meta_data = [
        ['Receipt No:', receipt.receipt_number, 'Date:', datetime.now().strftime('%d %b %Y, %H:%M')],
        ['Admin:', receipt.admin_name, 'Status:', tx.status],
    ]
    meta_table = Table(meta_data, colWidths=[35 * mm, 60 * mm, 30 * mm, 45 * mm])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8 * mm))

    # Amount block
    elements.append(Paragraph(f"KES {float(tx.amount_kes):,.2f}", styles['amount']))
    elements.append(Paragraph(f"USD {float(tx.amount_usd):,.4f}", styles['subtitle']))
    elements.append(Spacer(1, 6 * mm))

    # Transaction details
    detail_header = Table(
        [['TRANSACTION DETAILS']],
        colWidths=[170 * mm]
    )
    detail_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREEN),
        ('TEXTCOLOR', (0, 0), (-1, -1), WHITE),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(detail_header)

    detail_data = [
        ['Transaction Type', tx.type.replace('_', ' ')],
        ['Phone Number', tx.phone_number or 'N/A'],
        ['Recipient', tx.recipient_name or 'N/A'],
        ['M-Pesa Receipt', tx.mpesa_receipt_number or 'Pending'],
        ['Checkout Request ID', tx.checkout_request_id or 'N/A'],
        ['Description', tx.description or 'N/A'],
        ['Transaction Date', tx.created_at.strftime('%d %b %Y, %H:%M:%S') if tx.created_at else 'N/A'],
    ]

    detail_table = Table(detail_data, colWidths=[60 * mm, 110 * mm])
    detail_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), DARK),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHITE, LIGHT_GRAY]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(detail_table)
    elements.append(Spacer(1, 12 * mm))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E0E0E0'), spaceAfter=6))
    elements.append(Paragraph(
        "This is an automatically generated receipt by the Riziki M-Pesa Admin System.",
        styles['footer']
    ))
    elements.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %b %Y at %H:%M:%S')}",
        styles['footer']
    ))

    doc.build(elements)
    return buffer.getvalue()


def generate_transactions_pdf(transactions) -> bytes:
    """Generate a PDF report for all transactions."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = _build_styles()
    elements = []

    elements.append(Paragraph("RIZIKI — Transaction Report", styles['title']))
    elements.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %b %Y at %H:%M')}",
        styles['subtitle']
    ))
    elements.append(HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=10))

    # Table header
    header = ['#', 'Type', 'Phone', 'KES Amount', 'Status', 'M-Pesa Receipt', 'Date']
    rows = [header]

    for i, tx in enumerate(transactions, 1):
        rows.append([
            str(i),
            tx.type.replace('_', ' '),
            tx.phone_number or '-',
            f"{float(tx.amount_kes):,.2f}",
            tx.status,
            tx.mpesa_receipt_number or '-',
            tx.created_at.strftime('%d/%m/%Y %H:%M') if tx.created_at else '-',
        ])

    col_widths = [10 * mm, 25 * mm, 28 * mm, 28 * mm, 22 * mm, 35 * mm, 32 * mm]
    table = Table(rows, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 10 * mm))
    elements.append(Paragraph(
        f"Total Transactions: {len(list(transactions))}",
        styles['bold']
    ))

    doc.build(elements)
    return buffer.getvalue()


def generate_client_pdf(client) -> bytes:
    """Generate a PDF profile card for a client."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = _build_styles()
    elements = []

    elements.append(Paragraph("RIZIKI", styles['title']))
    elements.append(Paragraph("Client Profile", styles['subtitle']))
    elements.append(HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=12))

    data = [
        ['Client Name', client.name],
        ['Client Type', client.client_type],
        ['Phone Number', client.phone_number or 'N/A'],
        ['Till Number', client.till_number or 'N/A'],
        ['Paybill Number', client.paybill_number or 'N/A'],
        ['Account Number', client.account_number or 'N/A'],
        ['Notes', client.notes or 'N/A'],
        ['Registered On', client.created_at.strftime('%d %b %Y') if client.created_at else 'N/A'],
    ]

    table = Table(data, colWidths=[60 * mm, 110 * mm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHITE, LIGHT_GRAY]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E0E0E0'), spaceAfter=6))
    elements.append(Paragraph("Riziki M-Pesa Admin System — Client Record", styles['footer']))

    doc.build(elements)
    return buffer.getvalue()
