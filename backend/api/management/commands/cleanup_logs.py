from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import EmergencyAccess, AuditLog
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Cleanup expired emergency access sessions and old audit logs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days of audit logs to retain'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        now = timezone.now()
        
        # 1. Cleanup expired EmergencyAccess sessions
        # Mark sessions as expired if they haven't been completed and are past their expires_at
        expired_sessions = EmergencyAccess.objects.filter(
            status='active',
            expires_at__lt=now
        )
        
        session_count = expired_sessions.count()
        if not dry_run:
            expired_sessions.update(status='expired', ended_at=now)
            self.stdout.write(self.style.SUCCESS(f'Successfully marked {session_count} emergency sessions as expired'))
        else:
            self.stdout.write(f'[DRY RUN] Would mark {session_count} emergency sessions as expired')

        # 2. Cleanup old AuditLogs
        retention_date = now - timedelta(days=days)
        old_logs = AuditLog.objects.filter(timestamp__lt=retention_date)
        
        log_count = old_logs.count()
        if not dry_run:
            old_logs.delete()
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {log_count} audit logs older than {days} days'))
        else:
            self.stdout.write(f'[DRY RUN] Would delete {log_count} audit logs older than {days} days')
            
        # 3. Specific cleanup for "biometric match" logs (more aggressive retention if needed)
        # For this demo, we'll stick to the general retention policy
