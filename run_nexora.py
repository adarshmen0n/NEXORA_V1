import os
import sys
import socket
import webbrowser
import uvicorn

# Ensure UTF-8 stdout for Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def main():
    print("=" * 68)
    print("        [NEXORA V1] SMART TRANSIT & EMERGENCY SYSTEM")
    print(" Next-generation Explainable Route Optimization & Retrieval Assistant")
    print("=" * 68)

    # 1. Ensure database is created and seeded
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nexora.db")
    if not os.path.exists(db_path):
        print(">> Database not found. Initializing and seeding default dataset...")
        try:
            from seed import seed_database
            seed_database()
            print(">> Database successfully seeded!")
        except Exception as e:
            print(f">> Seed warning: {e}")
    else:
        print(">> Persistent SQLite Database found (nexora.db).")

    lan_ip = get_lan_ip()
    port = 8000

    print("\n" + "-" * 68)
    print(" ACCESS URLS:")
    print(f" • Central Portal:        http://localhost:{port}/")
    print(f" • Admin Command Center:  http://localhost:{port}/admin/")
    print(f" • Driver Cockpit:        http://localhost:{port}/driver/")
    print(f" • Passenger Web App:     http://localhost:{port}/passenger/")
    print(f" • Responder Tactical:    http://localhost:{port}/responder/")
    print(f" • REST API Docs:         http://localhost:{port}/docs")
    print("-" * 68)
    print(f" 📱 MOBILE ACCESS ON WI-FI / LAN:")
    print(f" Open on your smartphone: http://{lan_ip}:{port}/")
    print("-" * 68)
    print(" DEFAULT DEMO ACCOUNTS (Password for all: 'Password123'):")
    print("  • Admin:     admin@nexora.local     (ADM-001)")
    print("  • Driver:    driver@nexora.local    (DRV-001)")
    print("  • Passenger: passenger@nexora.local (PAX-001)")
    print("  • Responder: responder@nexora.local (RSP-001)")
    print("=" * 68 + "\n")

    # Automatically open default portal in browser
    try:
        webbrowser.open(f"http://localhost:{port}/")
    except Exception:
        pass

    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)

if __name__ == "__main__":
    main()
