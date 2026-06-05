# backend/mpesa_app/daraja.py
"""
Daraja API helper — all M-Pesa API interactions live here.
"""
import os
import base64
import hashlib
import requests
from datetime import datetime
from django.conf import settings


SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke'
PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke'


def _get_base_url() -> str:
    # Check Django configuration, fallback to system env, default to production if completely missing
    env = getattr(settings, 'MPESA_ENVIRONMENT', os.getenv('MPESA_ENVIRONMENT', 'production')).lower()
    return PRODUCTION_BASE_URL if env == 'production' else SANDBOX_BASE_URL


def get_access_token() -> str:
    """Fetch OAuth access token from Daraja API."""
    base_url = _get_base_url()
    consumer_key = getattr(settings, 'MPESA_CONSUMER_KEY', '')
    consumer_secret = getattr(settings, 'MPESA_CONSUMER_SECRET', '')

    credentials = f"{consumer_key}:{consumer_secret}"
    encoded = base64.b64encode(credentials.encode()).decode()

    response = requests.get(
        f"{base_url}/oauth/v1/generate?grant_type=client_credentials",
        headers={'Authorization': f'Basic {encoded}'},
        timeout=30
    )
    response.raise_for_status()
    return response.json().get('access_token', '')


# Retain alias for any internal imports using the old private namespace name
_get_access_token = get_access_token


def _generate_password(shortcode: str, passkey: str, timestamp: str) -> str:
    """Generate STK Push password."""
    raw = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


def _get_timestamp() -> str:
    return datetime.now().strftime('%Y%m%d%H%M%S')


def stk_push(
    phone_number: str,
    amount: int,
    account_reference: str,
    transaction_desc: str,
    callback_url: str,
    **kwargs
) -> dict:
    """Initiate Lipa Na M-Pesa Online (STK Push) using Buy Goods Vetted Parameters."""
    access_token = get_access_token()
    base_url = _get_base_url()
    
    # In Buy Goods (Till), the shortcode variable represents your Head Office/Till ID used to authenticate
    shortcode = getattr(settings, 'MPESA_SHORTCODE', '')
    passkey = getattr(settings, 'MPESA_PASSKEY', '')
    timestamp = _get_timestamp()
    password = _generate_password(shortcode, passkey, timestamp)

    # Normalize phone number to 2547XXXXXXXX
    phone = phone_number.strip().replace('+', '').replace(' ', '')
    if phone.startswith('0'):
        phone = '254' + phone[1:]

    # For Buy Goods, PartyB must be the actual target Store Number (Till Number) receiving the cash, 
    # fallback to the primary shortcode if an explicit store number isn't passed in kwargs
    store_number = kwargs.get('store_number', shortcode)

    payload = {
        'BusinessShortCode': shortcode,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': 'CustomerBuyGoodsOnline', # Updated from CustomerPayBillOnline
        'Amount': int(amount),
        'PartyA': phone,
        'PartyB': store_number,                       # Must be the Till / Store Number receiving funds
        'PhoneNumber': phone,
        'CallBackURL': callback_url or getattr(settings, 'MPESA_CALLBACK_URL', ''),
        'AccountReference': account_reference,
        'TransactionDesc': transaction_desc,
    }

    response = requests.post(
        f"{base_url}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()


def b2c_payment(
    phone_number: str,
    amount: int,
    command_id: str,
    remarks: str,
    occasion: str = '',
    **kwargs
) -> dict:
    """Send money from business to customer (B2C)."""
    access_token = get_access_token()
    base_url = _get_base_url()

    phone = phone_number.strip().replace('+', '').replace(' ', '')
    if phone.startswith('0'):
        phone = '254' + phone[1:]

    payload = {
        'InitiatorName': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': command_id,  # SalaryPayment | BusinessPayment | PromotionPayment
        'Amount': int(amount),
        'PartyA': getattr(settings, 'MPESA_SHORTCODE', ''),
        'PartyB': phone,
        'Remarks': remarks,
        'QueueTimeOutURL': getattr(settings, 'MPESA_B2C_QUEUE_TIMEOUT_URL', ''),
        'ResultURL': getattr(settings, 'MPESA_B2C_RESULT_URL', ''),
        'Occasion': occasion,
    }

    response = requests.post(
        f"{base_url}/mpesa/b2c/v1/paymentrequest",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()


def b2b_payment(
    party_b: str,
    amount: int,
    command_id: str,
    account_reference: str,
    remarks: str,
    **kwargs
) -> dict:
    """Send money from business to business (B2B)."""
    access_token = get_access_token()
    base_url = _get_base_url()

    payload = {
        'Initiator': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': command_id,  # BusinessPayBill | MerchantToMerchantTransfer
        'SenderIdentifierType': '4',
        'RecieverIdentifierType': '4',
        'Amount': int(amount),
        'PartyA': getattr(settings, 'MPESA_SHORTCODE', ''),
        'PartyB': party_b,
        'AccountReference': account_reference,
        'Remarks': remarks,
        'QueueTimeOutURL': getattr(settings, 'MPESA_B2B_QUEUE_TIMEOUT_URL', ''),
        'ResultURL': getattr(settings, 'MPESA_B2B_RESULT_URL', ''),
    }

    response = requests.post(
        f"{base_url}/mpesa/b2b/v1/paymentrequest",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()


def register_c2b_url(
    confirmation_url: str,
    validation_url: str,
    response_type: str = 'Completed',
    **kwargs
) -> dict:
    """Register C2B URLs."""
    access_token = get_access_token()
    base_url = _get_base_url()

    payload = {
        'ShortCode': getattr(settings, 'MPESA_SHORTCODE', ''),
        'ResponseType': response_type,
        'ConfirmationURL': confirmation_url,
        'ValidationURL': validation_url,
    }

    response = requests.post(
        f"{base_url}/mpesa/c2b/v1/registerurl",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()


def simulate_c2b(
    amount: int,
    msisdn: str,
    bill_ref_number: str = 'TEST',
    **kwargs
) -> dict:
    """Simulate C2B transaction (sandbox only)."""
    access_token = get_access_token()
    base_url = _get_base_url()

    payload = {
        'ShortCode': getattr(settings, 'MPESA_SHORTCODE', ''),
        'CommandID': 'CustomerBuyGoodsOnline', # Updated from CustomerPayBillOnline
        'Amount': int(amount),
        'Msisdn': msisdn,
        'BillRefNumber': bill_ref_number,
    }

    response = requests.post(
        f"{base_url}/mpesa/c2b/v1/simulate",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()


def transaction_status(transaction_id: str, remarks: str = 'Query', **kwargs) -> dict:
    """Query transaction status."""
    access_token = get_access_token()
    base_url = _get_base_url()

    payload = {
        'Initiator': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': 'TransactionStatusQuery',
        'TransactionID': transaction_id,
        'PartyA': getattr(settings, 'MPESA_SHORTCODE', ''),
        'IdentifierType': '4',
        'ResultURL': getattr(settings, 'MPESA_BALANCE_RESULT_URL', ''),
        'QueueTimeOutURL': getattr(settings, 'MPESA_BALANCE_QUEUE_TIMEOUT_URL', ''),
        'Remarks': remarks,
        'Occasion': '',
    }

    response = requests.post(
        f"{base_url}/mpesa/transactionstatus/v1/query",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()


def account_balance(**kwargs) -> dict:
    """Query account balance."""
    access_token = get_access_token()
    base_url = _get_base_url()

    payload = {
        'Initiator': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': 'AccountBalance',
        'PartyA': getattr(settings, 'MPESA_SHORTCODE', ''),
        'IdentifierType': '4',
        'Remarks': 'Balance query',
        'QueueTimeOutURL': getattr(settings, 'MPESA_BALANCE_QUEUE_TIMEOUT_URL', ''),
        'ResultURL': getattr(settings, 'MPESA_BALANCE_RESULT_URL', ''),
    }

    response = requests.post(
        f"{base_url}/mpesa/accountbalance/v1/query",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()


def reverse_transaction(
    transaction_id: str,
    amount: int,
    remarks: str,
    occasion: str = '',
    **kwargs
) -> dict:
    """Reverse a completed M-Pesa transaction."""
    access_token = get_access_token()
    base_url = _get_base_url()

    payload = {
        'Initiator': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': 'TransactionReversal',
        'TransactionID': transaction_id,
        'Amount': int(amount),
        'ReceiverParty': getattr(settings, 'MPESA_SHORTCODE', ''),
        'ReceiverIdentifierType': '11',
        'ResultURL': getattr(settings, 'MPESA_REVERSAL_RESULT_URL', ''),
        'QueueTimeOutURL': getattr(settings, 'MPESA_REVERSAL_QUEUE_TIMEOUT_URL', ''),
        'Remarks': remarks,
        'Occasion': occasion,
    }

    response = requests.post(
        f"{base_url}/mpesa/reversal/v1/request",
        json=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()