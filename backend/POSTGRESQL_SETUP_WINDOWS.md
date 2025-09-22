# PostgreSQL Setup Solutions for Windows Development

## Problem
The `psycopg2-binary` package is failing to install on Windows because it can't find `pg_config` executable.

## Solutions (Try in Order)

### Solution 1: Use Updated psycopg2-binary (RECOMMENDED)
```bash
# Try installing the newer version
pip install psycopg2-binary==2.9.9

# Or use the Windows requirements file
pip install -r requirements-windows.txt
```

### Solution 2: Use Modern psycopg (Python 3.7+)
```bash
# Uninstall old version if present
pip uninstall psycopg2-binary

# Install modern psycopg with binary wheels
pip install "psycopg[binary]"==3.1.13
```

### Solution 3: Install PostgreSQL for Windows
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Install PostgreSQL (this includes pg_config)
3. Add PostgreSQL bin directory to PATH:
   - Default: `C:\Program Files\PostgreSQL\15\bin`
4. Restart your terminal and try installing again

### Solution 4: Use SQLite for Development (EASIEST)
For local development, you can use SQLite instead of PostgreSQL:

1. Comment out psycopg2-binary in requirements.txt
2. Update Django settings to use SQLite:

```python
# In settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### Solution 5: Use Conda (Alternative Package Manager)
```bash
# Install conda/miniconda first, then:
conda install psycopg2
pip install -r requirements.txt --no-deps psycopg2-binary
```

### Solution 6: Use Pre-compiled Wheel
```bash
# Download wheel directly from PyPI and install
pip install --only-binary=psycopg2-binary psycopg2-binary
```

## For Production
Always use PostgreSQL in production. The development solutions above are just for getting started quickly on Windows.

## Next Steps After Fixing Database Issue
1. Run migrations: `python manage.py migrate`
2. Create superuser: `python manage.py createsuperuser`
3. Start development server: `python manage.py runserver`

## Docker Alternative (RECOMMENDED for consistency)
If you keep having issues, use Docker for development:

```bash
# Navigate to backend directory
cd backend

# Build and run with Docker
docker-compose up -d

# This includes PostgreSQL and handles all dependencies
```