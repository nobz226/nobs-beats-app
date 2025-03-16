#!/usr/bin/env python3

import subprocess
import time
import sys
import shutil
import signal
import os
import atexit

# ANSI colors for terminal output
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'  # No Color

flask_process = None
cloudflared_process = None

def print_colored(color, text):
    """Print text with color."""
    print(f"{color}{text}{NC}")

def check_cloudflared():
    """Check if cloudflared is installed."""
    if not shutil.which("cloudflared"):
        print_colored(RED, "Error: cloudflared is not installed.")
        print("Please install it with: brew install cloudflared (Mac) or follow instructions at https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/")
        sys.exit(1)
    print_colored(GREEN, "✓ cloudflared is installed")

def start_flask_app():
    """Start the Flask application."""
    global flask_process
    
    print_colored(YELLOW, "Starting Flask app...")
    flask_process = subprocess.Popen(
        ["python", "app.py"],
        stdout=open("flask_app.log", "w"),
        stderr=subprocess.STDOUT
    )
    
    # Wait for Flask to start up
    print_colored(YELLOW, "Waiting for Flask app to start...")
    time.sleep(3)
    
    # Check if Flask app is running
    try:
        result = subprocess.run(
            ["curl", "-s", "http://localhost:5002"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=5
        )
        if result.returncode == 0:
            print_colored(GREEN, "✓ Flask app is running on http://localhost:5002")
        else:
            print_colored(RED, "Flask app didn't start properly. Check flask_app.log for details.")
            cleanup()
            sys.exit(1)
    except subprocess.TimeoutExpired:
        print_colored(RED, "Timed out waiting for Flask app to respond")
        cleanup()
        sys.exit(1)

def start_cloudflare_tunnel():
    """Start a Cloudflare tunnel to the Flask app."""
    global cloudflared_process
    
    print_colored(YELLOW, "Creating Cloudflare tunnel...")
    print_colored(GREEN, "Your app will be available at the URL shown below:")
    
    # Start cloudflared in the foreground
    cloudflared_process = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", "http://localhost:5002"]
    )
    
    # This will block until cloudflared exits
    cloudflared_process.wait()
    
    print_colored(RED, "Cloudflare tunnel has stopped.")

def cleanup(*args):
    """Clean up processes when script is terminated."""
    print_colored(YELLOW, "\nShutting down...")
    
    if cloudflared_process:
        print_colored(YELLOW, "Stopping Cloudflare tunnel...")
        cloudflared_process.terminate()
    
    if flask_process:
        print_colored(YELLOW, "Stopping Flask app...")
        flask_process.terminate()
    
    print_colored(GREEN, "Cleanup complete. Goodbye!")
    sys.exit(0)

def main():
    """Main function to run the script."""
    # Register cleanup functions
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    atexit.register(cleanup)
    
    check_cloudflared()
    start_flask_app()
    start_cloudflare_tunnel()

if __name__ == "__main__":
    main() 