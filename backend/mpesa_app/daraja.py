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
    """Initiate Lipa Na M-Pesa Online (STK Push) using Buy Goods Parameters."""
    access_token = get_access_token()
    base_url = _get_base_url()
    
    shortcode = getattr(settings, 'MPESA_SHORTCODE', '')
    passkey = getattr(settings, 'MPESA_PASSKEY', '')
    timestamp = _get_timestamp()
    password = _generate_password(shortcode, passkey, timestamp)

    phone = phone_number.strip().replace('+', '').replace(' ', '')
    if phone.startswith('0'):
        phone = '254' + phone[1:]

    till_number = kwargs.get('till_number', '123456')  # Default till number if not provided, can be overridden via kwargs

    payload = {
        'BusinessShortCode': shortcode,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': 'CustomerBuyGoodsOnline',
        'Amount': int(amount),
        'PartyA': phone,
        'PartyB': till_number,
        'PhoneNumber': phone,
        'CallBackURL': callback_url or getattr(settings, 'MPESA_CALLBACK_URL', ''),
        'AccountReference': account_reference or 'RizikiApp',
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
        'CommandID': command_id,
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
    """Send money from business to business (B2B) - Responsive to Paybill and Tills."""
    access_token = get_access_token()
    base_url = _get_base_url()

    if command_id == 'BusinessPayBill':
        receiver_identifier_type = '4'
    else:
        receiver_identifier_type = '2'

    payload = {
        'Initiator': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': command_id,
        'SenderIdentifierType': '4',
        'RecieverIdentifierType': receiver_identifier_type, 
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
        'CommandID': 'CustomerBuyGoodsOnline',
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
    """Query transaction status - responsive to business or till queries."""
    access_token = get_access_token()
    base_url = _get_base_url()

    # Pass identifier_type='2' if you are looking up a status tied explicitly to a Till number
    identifier_type = kwargs.get('identifier_type', '4')

    payload = {
        'Initiator': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': 'TransactionStatusQuery',
        'TransactionID': transaction_id,
        'PartyA': getattr(settings, 'MPESA_SHORTCODE', ''),
        'IdentifierType': identifier_type, # 4 for Organization Shortcode, 2 for Merchant Till
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
    """Query account balance - supports tracking balance on Shortcode or specific Tills."""
    access_token = get_access_token()
    base_url = _get_base_url()

    # Pass identifier_type='2' if checking balance directly on a custom Till Number ledger
    identifier_type = kwargs.get('identifier_type', '4')
    party_a = kwargs.get('party_a', getattr(settings, 'MPESA_SHORTCODE', ''))

    payload = {
        'Initiator': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': 'AccountBalance',
        'PartyA': party_a,
        'IdentifierType': identifier_type, # 4 for Organization Shortcode, 2 for Till Number
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
    """Reverse a completed M-Pesa transaction with dynamic receiver configuration."""
    access_token = get_access_token()
    base_url = _get_base_url()

    # 11 is default for organization system-side reversals, but can be altered if required
    receiver_identifier_type = kwargs.get('receiver_identifier_type', '11')

    payload = {
        'Initiator': getattr(settings, 'MPESA_INITIATOR_NAME', ''),
        'SecurityCredential': getattr(settings, 'MPESA_SECURITY_CREDENTIAL', ''),
        'CommandID': 'TransactionReversal',
        'TransactionID': transaction_id,
        'Amount': int(amount),
        'ReceiverParty': getattr(settings, 'MPESA_SHORTCODE', ''),
        'ReceiverIdentifierType': receiver_identifier_type,
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