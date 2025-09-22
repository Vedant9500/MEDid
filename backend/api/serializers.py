from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Patient, BiometricRecord


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'


class BiometricRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometricRecord
        fields = '__all__'


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class DemoTokenSerializer(serializers.Serializer):
    message = serializers.CharField(default="Demo access granted")