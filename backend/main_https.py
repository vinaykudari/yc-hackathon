"""
HTTPS version of the FastAPI server for DOM API Updater Chrome Extension
This version uses self-signed certificates for HTTPS support
"""

import ssl
import uvicorn
from main import app  # Import the existing FastAPI app

if __name__ == "__main__":
    # Create SSL context with self-signed certificate
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    
    # For development, we'll create a simple self-signed cert
    # In production, use proper certificates
    try:
        # Try to use existing cert files if they exist
        ssl_context.load_cert_chain("cert.pem", "key.pem")
        print("Using existing SSL certificates")
    except FileNotFoundError:
        print("SSL certificates not found. Please create them first:")
        print("Run: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes")
        print("Or use the HTTP version for testing on HTTP sites")
        exit(1)
    
    # Run with HTTPS
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8443,  # Standard HTTPS port alternative
        ssl_keyfile="key.pem",
        ssl_certfile="cert.pem",
        log_level="info"
    )
