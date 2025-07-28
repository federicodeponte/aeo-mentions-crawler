#!/usr/bin/env python3
"""
Setup script for PEEC AI Backend
Helps initialize the project and verify configuration
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 11):
        print("❌ Python 3.11+ is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        "fastapi",
        "uvicorn", 
        "supabase",
        "openai",
        "google-generativeai",
        "httpx",
        "python-dotenv",
        "pydantic"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - missing")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\nInstall missing packages with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

def check_env_file():
    """Check if .env file exists and has required variables"""
    env_file = Path(".env")
    
    if not env_file.exists():
        print("❌ .env file not found")
        print("Copy .env.example to .env and configure your API keys")
        return False
    
    print("✅ .env file exists")
    
    # Check for required environment variables
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY", 
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
        "PERPLEXITY_API_KEY"
    ]
    
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please configure these in your .env file")
        return False
    
    print("✅ All required environment variables are set")
    return True

def test_supabase_connection():
    """Test Supabase connection"""
    try:
        from services.supabase_service import SupabaseService
        supabase = SupabaseService()
        companies = supabase.get_companies()
        print(f"✅ Supabase connection successful - found {len(companies)} companies")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def test_llm_services():
    """Test LLM service initialization"""
    try:
        from services.llm_service import LLMService
        llm_service = LLMService()
        print("✅ LLM service initialized successfully")
        return True
    except Exception as e:
        print(f"❌ LLM service initialization failed: {e}")
        return False

def install_dependencies():
    """Install required dependencies"""
    print("Installing dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def create_env_file():
    """Create .env file from example"""
    if Path(".env").exists():
        print("✅ .env file already exists")
        return True
    
    if Path(".env.example").exists():
        import shutil
        shutil.copy(".env.example", ".env")
        print("✅ Created .env file from .env.example")
        print("Please edit .env file with your API keys")
        return True
    else:
        print("❌ .env.example not found")
        return False

def main():
    """Main setup function"""
    print("=== PEEC AI Backend Setup ===\n")
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment File", check_env_file),
    ]
    
    # If dependencies are missing, offer to install them
    if not check_dependencies():
        print("\nWould you like to install missing dependencies? (y/n): ", end="")
        if input().lower() == 'y':
            if not install_dependencies():
                return False
            # Re-check dependencies
            if not check_dependencies():
                return False
    
    # If .env file is missing, offer to create it
    if not check_env_file():
        print("\nWould you like to create .env file from .env.example? (y/n): ", end="")
        if input().lower() == 'y':
            if not create_env_file():
                return False
            print("Please configure your API keys in .env file and run setup again")
            return False
    
    # Test connections if environment is configured
    if check_env_file():
        checks.extend([
            ("Supabase Connection", test_supabase_connection),
            ("LLM Services", test_llm_services),
        ])
    
    print("\n--- Running Checks ---")
    all_passed = True
    
    for check_name, check_func in checks:
        print(f"\n{check_name}:")
        if not check_func():
            all_passed = False
    
    print("\n=== Setup Summary ===")
    if all_passed:
        print("✅ All checks passed! Your PEEC AI Backend is ready to use.")
        print("\nNext steps:")
        print("1. Start the server: python main.py")
        print("2. Test the API: python test_api.py")
        print("3. Deploy to Modal: modal deploy modal_app.py")
    else:
        print("❌ Some checks failed. Please fix the issues above and run setup again.")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 