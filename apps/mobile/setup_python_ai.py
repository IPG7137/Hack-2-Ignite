#!/usr/bin/env python3
"""
Setup script for Civic Resolve Python AI Integration
This script installs the required dependencies for the disaster image classifier.
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} - Success")
            if result.stdout.strip():
                print(f"   Output: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ {description} - Failed")
            if result.stderr.strip():
                print(f"   Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"❌ {description} - Exception: {e}")
        return False

def check_python():
    """Check if Python is available."""
    print("🐍 Checking Python installation...")
    result = subprocess.run(["python", "--version"], capture_output=True, text=True)
    if result.returncode == 0:
        print(f"✅ Python found: {result.stdout.strip()}")
        return True
    else:
        print("❌ Python not found in PATH")
        return False

def install_packages():
    """Install required Python packages."""
    packages = [
        "google-generativeai",
        "pillow"
    ]
    
    success = True
    for package in packages:
        if not run_command(f"pip install {package}", f"Installing {package}"):
            success = False
    
    return success

def test_installation():
    """Test if the installation works."""
    print("🧪 Testing installation...")
    
    test_code = """
import google.generativeai as genai
from PIL import Image
import os
print("✅ All imports successful!")
print("📦 google-generativeai version:", genai.__version__)
print("📦 PIL version:", Image.__version__)
"""
    
    try:
        result = subprocess.run([sys.executable, "-c", test_code], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Installation test passed!")
            print(result.stdout)
            return True
        else:
            print("❌ Installation test failed!")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Test exception: {e}")
        return False

def setup_environment():
    """Help user set up environment variables."""
    print("\n🔐 Environment Variable Setup")
    print("=" * 50)
    print("Set your Gemini API key as an environment variable:")
    print("")
    
    if os.name == 'nt':  # Windows
        print("Windows PowerShell:")
        print('$env:GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"')
        print("")
        print("Windows Command Prompt:")
        print('set GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>')
    else:  # Unix-like
        print("Linux/MacOS Terminal:")
        print('export GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"')
    
    print("")
    print("💡 Note: The classifier will work with GEMINI_API_KEY configured.")

def main():
    """Main setup function."""
    print("🚀 Civic Resolve Python AI Setup")
    print("=" * 50)
    
    # Check Python
    if not check_python():
        print("\n❌ Setup failed: Python not found")
        print("Please install Python and ensure it's in your PATH")
        return False
    
    print()
    
    # Install packages
    if not install_packages():
        print("\n❌ Setup failed: Package installation failed")
        return False
    
    print()
    
    # Test installation
    if not test_installation():
        print("\n❌ Setup failed: Installation test failed")
        return False
    
    print()
    
    # Setup instructions
    setup_environment()
    
    print("\n✅ Setup Complete!")
    print("=" * 50)
    print("You can now use the disaster image classifier:")
    print("1. From command line: python integrated_disaster_classifier.py <image_path>")
    print("2. From Flutter app: Automatic integration when uploading images")
    print("3. Test the classifier: python integrated_disaster_classifier.py --test")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)