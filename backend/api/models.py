from django.db import models
from django.contrib.auth.models import User


class Patient(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=200)
    age = models.IntegerField()
    blood_type = models.CharField(max_length=5)
    emergency_contact = models.CharField(max_length=200)
    last_visit = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.id})"


class BiometricRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    fingerprint_template = models.TextField()
    face_encoding = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Biometric for {self.patient.name}"