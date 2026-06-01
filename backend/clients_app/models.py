# backend/clients_app/models.py
from django.db import models


class Client(models.Model):
    CLIENT_TYPE_CHOICES = [
        ('PHONE', 'Phone Number'),
        ('TILL', 'Till Number'),
        ('PAYBILL', 'Paybill Number'),
    ]

    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    till_number = models.CharField(max_length=20, blank=True)
    paybill_number = models.CharField(max_length=20, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    client_type = models.CharField(
        max_length=10,
        choices=CLIENT_TYPE_CHOICES,
        default='PHONE'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clients'
        ordering = ['name']
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'

    def __str__(self):
        return f"{self.name} ({self.client_type})"
