import re
import secrets
import string
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError
from django.db.models.signals import pre_delete
from django.dispatch import receiver

# ---------------------------------------------------------------------------
# Passkey Format Specification
# ---------------------------------------------------------------------------
# Format : RZK + Exactly 4 digits (e.g., RZK4821, RZK9301, RZK1029)
# Regex  : ^RZK\d{4}$
# ---------------------------------------------------------------------------
PASSKEY_PATTERN = re.compile(r'^RZK\d{4}$')
PASSKEY_DIGITS = 4


def generate_transaction_passkey() -> str:
    """
    Module-level function required by migration fields and defaults.
    Generates a cryptographically secure transactional passkey.
    Format : RZK + exactly 4 random numeric digits.
    """
    # Build the numeric segment using secrets for cryptographic randomness.
    # Ensure the first digit is never 0 to avoid leading-zero ambiguity issues.
    first_digit = secrets.choice('123456789')
    remaining_digits = ''.join(
        secrets.choice(string.digits) for _ in range(PASSKEY_DIGITS - 1)
    )
    numeric_segment = first_digit + remaining_digits
    raw_passkey = f"RZK{numeric_segment}"
    
    return raw_passkey


class AdminUser(AbstractUser):
    """
    Extended user model for the Riziki admin application.

    Each user is assigned a unique transactional passkey upon onboarding.
    This passkey is used exclusively to authorize sensitive operations.
    
    Both the plain-text value (visible to admins) and its secure hash are persisted.
    """

    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    
    # Secure storage for the transactional passkey hash
    passkey_hash = models.CharField(max_length=255, blank=True)
    
    # Plain text storage so administrators can review the passkeys when necessary
    passkey_plain = models.CharField(
        max_length=20, 
        default=generate_transaction_passkey,
        help_text="Stored plain-text copy for administrative review. Auto-generated on creation."
    )
    
    passkey_assigned = models.BooleanField(
        default=False,
        help_text="Indicates whether a transactional passkey has been assigned to this user."
    )
    passkey_revealed = models.BooleanField(
        default=False,
        help_text="Tracks whether the generated passkey has been revealed to the user at least once."
    )
    
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profile_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admin_users'
        verbose_name = 'Admin User'
        verbose_name_plural = 'Admin Users'

    def __str__(self):
        return self.username

    # ------------------------------------------------------------------
    # Passkey Management Logic
    # ------------------------------------------------------------------

    @staticmethod
    def validate_passkey_format(raw_passkey: str) -> bool:
        """
        Validates that a given passkey string conforms to the required format:
        RZK + exactly 4 numeric digits.
        """
        if not isinstance(raw_passkey, str):
            return False
        return bool(PASSKEY_PATTERN.match(raw_passkey))

    def save(self, *args, **kwargs):
        """Override save to ensure initial hashes match plain text defaults."""
        # Fallback to make sure a plain text key is never blank
        if not self.passkey_plain:
            self.passkey_plain = generate_transaction_passkey()

        # Generate a secure hash if plain text is present but the hash is missing
        if self.passkey_plain and not self.passkey_hash:
            if self.validate_passkey_format(self.passkey_plain):
                self.passkey_hash = make_password(self.passkey_plain)
                self.passkey_assigned = True
            else:
                raise ValidationError("The automatically generated or provided plain passkey format is invalid.")

        # Guarantee the assignment flag is True if a hash exists
        if self.passkey_hash:
            self.passkey_assigned = True

        # ── FIX: Intercept update_fields to explicitly append passkey_plain ──
        if 'update_fields' in kwargs and kwargs['update_fields'] is not None:
            update_fields = set(kwargs['update_fields'])
            # If tracking fields are altered, guarantee plain text matches SQL tracking commits
            if self.passkey_hash:
                update_fields.update(['passkey_hash', 'passkey_plain', 'passkey_assigned'])
            kwargs['update_fields'] = list(update_fields)

        super().save(*args, **kwargs)

    def set_passkey(self, raw_passkey: str) -> None:
        """
        Validates, hashes, stores the raw transaction passkey, and sets
        the plain text field for admin visibility layouts.
        """
        if not self.validate_passkey_format(raw_passkey):
            raise ValidationError(
                f"Invalid passkey format: '{raw_passkey}'. "
                f"Passkey must start with 'RZK' followed by exactly {PASSKEY_DIGITS} numeric digits."
            )

        self.passkey_hash = make_password(raw_passkey)
        self.passkey_plain = raw_passkey  # Retain unhashed version for admin visibility
        self.passkey_assigned = True
        self.passkey_revealed = False     # Reset visibility status for new passkey
        
        self.save(update_fields=[
            'passkey_hash', 
            'passkey_plain', 
            'passkey_assigned', 
            'passkey_revealed'
        ])

    def check_passkey(self, raw_passkey: str) -> bool:
        """
        Verifies a supplied raw passkey against the stored hash safely.
        """
        if not self.passkey_hash:
            return False

        # Fast-fail on malformed input before processing hash verification overhead
        if not self.validate_passkey_format(raw_passkey):
            return False

        return check_password(raw_passkey, self.passkey_hash)

    def validate_transaction_passkey(self, passkey: str) -> bool:
        """Compatibility signature alias for check_passkey verification logic."""
        return self.check_passkey(passkey)

    def reset_passkey(self) -> str:
        """
        Generates a brand-new passkey, hashes and stores it, then
        returns the raw value so it can be surfaced to the user exactly once.
        """
        raw = generate_transaction_passkey()
        self.set_passkey(raw)   # handles format validation, hashing, status shifts, and saving
        return raw

    def regenerate_passkey(self) -> str:
        """Compatibility signature alias link for secondary layout calls."""
        return self.reset_passkey()


# ---------------------------------------------------------------------------
# Database Integrity Signals
# ---------------------------------------------------------------------------

@receiver(pre_delete, sender=AdminUser)
def delete_user_outstanding_tokens(sender, instance, **kwargs):
    """
    Prevents IntegrityErrors when deleting users via the Admin Panel.
    Automatically purges outstanding JWT tracked tokens from SimpleJWT 
    before the user's row is removed from the admin_users table.
    """
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        OutstandingToken.objects.filter(user=instance).delete()
    except (ImportError, RuntimeError, Exception):
        # Gracefully skip if simplejwt outstanding token tracking model is uninstalled/inactive
        pass