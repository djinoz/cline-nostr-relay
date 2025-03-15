#!/usr/bin/env python3
"""
Nostr Test Message Generator

This script generates a Nostr event and sends it to a relay.
It creates a new key pair (npub/nsec) each time it runs unless provided as command line arguments.
"""

import argparse
import json
import sys
import time
import websocket
from typing import Dict, List, Tuple, Optional

from pynostr.event import Event
from pynostr.key import PrivateKey
from pynostr.bech32 import bech32_encode, bech32_decode

# Hardcoded relay address - change this to your relay's IP address
DEFAULT_RELAY_URL = "ws://<your host and port>"  # Default to localhost:8008

def generate_keypair() -> Tuple[str, str]:
    """Generate a new Nostr keypair (npub, nsec)"""
    private_key = PrivateKey()
    
    # Convert to bech32 format
    nsec = private_key.bech32()
    npub = private_key.public_key.bech32()
    
    return npub, nsec

def create_and_send_event(
    private_key: PrivateKey, 
    relay_url: str, 
    content: str = "WARNING: Empty Note Content", 
    kind: int = 1
) -> Optional[str]:
    """
    Create and send a Nostr event to the specified relay
    
    Args:
        private_key: The PrivateKey object to sign the event
        relay_url: The WebSocket URL of the relay
        content: The content of the message
        kind: The kind of event (1 = text note)
        
    Returns:
        The event ID if successful, None otherwise
    """
    # Create a new event
    event = Event(
        content=content,
        pubkey=private_key.public_key.hex(),
        kind=kind,
        created_at=int(time.time())
    )
    
    # Sign the event
    event.sign(private_key.hex())
    
    # Print event details
    print(f"Event created:")
    print(f"  ID: {event.id}")
    print(f"  Pubkey: {event.pubkey}")
    print(f"  Kind: {event.kind}")
    print(f"  Content: {event.content}")
    print(f"  Created at: {event.created_at}")
    print(f"  Signature: {event.sig}")
    
    # Using direct WebSocket connection similar to the JavaScript implementation
    ws = None
    success = False
    
    try:
        # Connect to relay
        print(f"\nConnecting to relay: {relay_url}")
        ws = websocket.create_connection(relay_url)
        print("Connected to relay")
        
        # Convert event to JSON and send it
        event_json = json.dumps(event.to_dict())
        message = json.dumps(["EVENT", json.loads(event_json)])
        
        print(f"Sending message: {message}")
        ws.send(message)
        
        # Wait for response
        print("Waiting for response...")
        response = ws.recv()
        print(f"Received response: {response}")
        
        # Check if the response is an OK message
        response_data = json.loads(response)
        if response_data[0] == "OK" and response_data[1] == event.id:
            print("Event published successfully")
            success = True
        else:
            print(f"Unexpected response: {response}")
        
        return event.id if success else None
    except Exception as e:
        print(f"Error: {e}")
        return None
    finally:
        # Ensure connection is closed even if an error occurs
        try:
            if ws:
                ws.close()
        except Exception as e:
            print(f"Error closing connection: {e}")

def main():
    parser = argparse.ArgumentParser(description="Generate and send a Nostr event to a relay")
    parser.add_argument("--npub", help="Public key in npub format")
    parser.add_argument("--nsec", help="Private key in nsec format")
    parser.add_argument("--relay", default=DEFAULT_RELAY_URL, help=f"Relay URL (default: {DEFAULT_RELAY_URL})")
    parser.add_argument("--content", default="Hello from Nostr python test script!", help="Message content")
    parser.add_argument("--kind", type=int, default=1, help="Event kind (default: 1 for text note)")
    
    args = parser.parse_args()
    
    # Generate or use provided keys
    if args.nsec:
        try:
            # Decode the nsec
            hrp, data = bech32_decode(args.nsec)
            if hrp != "nsec":
                print("Error: Invalid nsec format")
                sys.exit(1)
            
            private_key = PrivateKey(bytes(data).hex())
            npub = private_key.public_key.bech32()
            nsec = args.nsec
            
            print(f"Using provided private key")
            print(f"Public key (npub): {npub}")
        except Exception as e:
            print(f"Error decoding nsec: {e}")
            sys.exit(1)
    else:
        print("Generating new keypair...")
        npub, nsec = generate_keypair()
        private_key = PrivateKey.from_nsec(nsec)
        
        print(f"Generated new keypair:")
        print(f"Public key (npub): {npub}")
        print(f"Private key (nsec): {nsec}")
    
    # Create and send event
    event_id = create_and_send_event(
        private_key=private_key,
        relay_url=args.relay,
        content=args.content,
        kind=args.kind
    )
    
    if event_id:
        print(f"\nEvent sent successfully!")
        print(f"Event ID: {event_id}")
    else:
        print("\nFailed to send event")
        sys.exit(1)

if __name__ == "__main__":
    main()
