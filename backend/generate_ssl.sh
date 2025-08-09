#!/bin/bash

# Generate SSL certificates for HTTPS development server
# This creates self-signed certificates for local development

echo "Generating self-signed SSL certificates for local development..."

# Generate private key and certificate in one command
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=CA/L=San Francisco/O=YC Hackathon/OU=Development/CN=localhost"

echo "SSL certificates generated:"
echo "- cert.pem (certificate)"
echo "- key.pem (private key)"
echo ""
echo "You can now run the HTTPS server with:"
echo "python main_https.py"
echo ""
echo "The server will be available at: https://localhost:8443/test-api"
echo ""
echo "Note: Your browser will show a security warning for self-signed certificates."
echo "Click 'Advanced' -> 'Proceed to localhost (unsafe)' to continue."
