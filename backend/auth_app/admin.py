import secrets
from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.db import transaction
from django.db.models import Max
from django.contrib.admin.models import LogEntry
from .models import AdminUser


# ---------------------------------------------------------------------------
# Custom Admin Actions
# ---------------------------------------------------------------------------

@admin.action(description="Reset transactional passkey for selected users")
def reset_passkey_action(modeladmin, request, queryset):
    """
    Superuser-only action that resets the transactional passkey for
    each selected user and displays the new raw passkeys once via
    Django admin messages.
    """
    if not request.user.is_superuser:
        modeladmin.message_user(
            request,
            "Only superusers can reset transactional passkeys.",
            level=messages.ERROR,
        )
        return

    output_lines = []
    for user in queryset:
        # ✅ Calls the updated reset passkey engine directly
        raw_passkey = user.reset_passkey()
        output_lines.append(
            f"<strong>{user.username}</strong> &rarr; "
            f"<code style='background:#f3f4f6;padding:2px 6px;border-radius:4px;"
            f"font-size:13px;color:#065f46;'>{raw_passkey}</code>"
        )

    message_html = (
        "<div style='line-height:2'>"
        "<p><strong>Passkeys reset successfully.</strong> "
        "Share these with each user securely — they will NOT be shown again:</p>"
        + "<br>".join(output_lines)
        + "</div>"
    )
    modeladmin.message_user(request, format_html(message_html), level=messages.SUCCESS)


# ---------------------------------------------------------------------------
# Admin Registration
# ---------------------------------------------------------------------------

@admin.register(AdminUser)
class AdminUserAdmin(BaseUserAdmin):
    actions      = [reset_passkey_action]
    list_display = (
        "id", "username", "email", "full_name",
        "phone_number", "passkey_status", "is_staff", "is_active",
    )
    search_fields  = ("username", "email", "full_name", "phone_number")
    list_filter    = ("is_staff", "is_active", "passkey_assigned")
    
    ordering       = ("id",)
    
    readonly_fields = (
        "passkey_assigned", 
        "display_assigned_passkey",
        "created_at", 
        "updated_at", 
        "last_login_ip"
    )

    fieldsets = (
        (None, {
            "fields": ("username", "password"),
        }),
        ("Personal Info", {
            "fields": ("full_name", "email", "phone_number"),
        }),
        ("Transactional Passkey", {
            "fields": ("passkey_assigned", "display_assigned_passkey"),
            "description": "The transactional passkey can be toggled open directly using the interactive tool below.",
        }),
        ("Permissions", {
            "fields": (
                "is_active", "is_staff", "is_superuser",
                "groups", "user_permissions",
            ),
        }),
        ("Audit", {
            "fields": ("last_login", "date_joined", "last_login_ip", "created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "username",
                "full_name",
                "email",
                "phone_number",
                "password1",
                "password2",
                "is_staff",
                "is_active",
            ),
        }),
    )

    @admin.display(description="Passkey Status", boolean=False)
    def passkey_status(self, obj: AdminUser) -> str:
        if obj.passkey_assigned:
            return format_html(
                "<span style='color:#065f46;background:#d1fae5;padding:2px 10px;"
                "border-radius:99px;font-size:11px;font-weight:700;'>Assigned</span>"
            )
        return format_html(
            "<span style='color:#92400e;background:#fef3c7;padding:2px 10px;"
            "border-radius:99px;font-size:11px;font-weight:700;'>Not Assigned</span>"
        )

    @admin.display(description="Assigned Passkey")
    def display_assigned_passkey(self, obj: AdminUser) -> str:
        if not obj.passkey_assigned:
            return format_html("<em style='color:#9ca3af;'>No active passkey generated</em>")

        # ✅ Corrected: Directly targets passkey_plain from your updated schema attributes
        plain_key = getattr(obj, 'passkey_plain', None)
        if not plain_key:
            return format_html("<em style='color:#dc2626;'>Passkey record values unavailable</em>")

        text_id = f"passkey-text-{obj.id}"
        btn_id = f"passkey-btn-{obj.id}"
        
        return format_html(
            "<div style='margin-top: 5px; display: flex; align-items: center; gap: 10px;'>"
            "  <div style='display: inline-flex; align-items: center; background: #f3f4f6; "
            "    border: 1px solid #d1d5db; border-radius: 6px; padding: 4px 8px; font-family: monospace;'>"
            "    <code id='{}' data-raw='{}' style='font-size: 15px; font-weight: 700; color: #1f2937; "
            "      letter-spacing: 2px; border: none; background: transparent; padding-right: 12px; "
            "      margin-right: 8px; border-right: 1px solid #d1d5db;'>••••••••</code>"
            "    <button id='{}' type='button' style='background: transparent; color: #2563eb; border: none; "
            "      font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; padding: 2px 4px; "
            "      transition: color 0.1s;' "
            "      onclick=\""
            "        var txt = document.getElementById('{}');"
            "        var btn = document.getElementById('{}');"
            "        if (btn.textContent === 'Show') {{"
            "           txt.textContent = txt.getAttribute('data-raw');"
            "           txt.style.color = '#16a34a';"
            "           btn.textContent = 'Hide';"
            "           btn.style.color = '#dc2626';"
            "        }} else {{"
            "           txt.textContent = '••••••••';"
            "           txt.style.color = '#1f2937';"
            "           btn.textContent = 'Show';"
            "           btn.style.color = '#2563eb';"
            "        }}"
            "      \">Show</button>"
            "  </div>"
            "</div>", 
            text_id, plain_key, btn_id, text_id, btn_id
        )

    def save_model(self, request, obj: AdminUser, form, change: bool):
        # ✅ Cleaned & Safely Intercepted: Missing fields fall back securely to the model methods
        if not obj.pk and not getattr(obj, 'passkey_plain', None):
            from .models import generate_transaction_passkey
            obj.passkey_plain = generate_transaction_passkey()
            
        super().save_model(request, obj, form, change)

    # ------------------------------------------------------------------
    # ID Compaction with Foreign Key Log Cascading
    # ------------------------------------------------------------------

    def delete_model(self, request, obj):
        with transaction.atomic():
            deleted_id = obj.id
            LogEntry.objects.filter(user_id=deleted_id).delete()
            self._clear_token_blacklist_for_users([deleted_id])
            super().delete_model(request, obj)
            self._resequence_user_ids(deleted_id)

    def delete_queryset(self, request, queryset):
        with transaction.atomic():
            target_ids = sorted(list(queryset.values_list('id', flat=True)))
            lowest_deleted_id = target_ids[0] if target_ids else None
            LogEntry.objects.filter(user_id__in=target_ids).delete()
            self._clear_token_blacklist_for_users(target_ids)
            queryset.delete()
            
            if lowest_deleted_id:
                self._resequence_user_ids(lowest_deleted_id)

    def _clear_token_blacklist_for_users(self, user_ids):
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
            OutstandingToken.objects.filter(user_id__in=user_ids).delete()
        except (ImportError, Exception):
            from django.db import connection
            with connection.cursor() as cursor:
                format_strings = ','.join(['%s'] * len(user_ids))
                cursor.execute(
                    f"DELETE FROM token_blacklist_outstandingtoken WHERE user_id IN ({format_strings})",
                    user_ids
                )

    def _resequence_user_ids(self, start_id):
        users_to_shift = AdminUser.objects.filter(id__gt=start_id).order_by('id')
        OutstandingToken = None
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        except ImportError:
            pass

        current_target_id = start_id
        for user in users_to_shift:
            old_id = user.id
            LogEntry.objects.filter(user_id=old_id).update(user_id=current_target_id)
            
            if OutstandingToken:
                OutstandingToken.objects.filter(user_id=old_id).update(user_id=current_target_id)
            else:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE token_blacklist_outstandingtoken SET user_id = %s WHERE user_id = %s",
                        [current_target_id, old_id]
                    )

            AdminUser.objects.filter(id=old_id).update(id=current_target_id)
            current_target_id += 1

        from django.db import connection
        with connection.cursor() as cursor:
            max_id = AdminUser.objects.all().aggregate(Max('id'))['id__max'] or 0
            next_id = max_id + 1
            # Explicitly handles auto-increment sequence indexing safety across database platforms
            try:
                cursor.execute(f"ALTER SEQUENCE admin_users_id_seq RESTART WITH {next_id};")
            except Exception:
                pass