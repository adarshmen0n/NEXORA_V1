import json
import datetime
import logging
from backend.database import SessionLocal, engine, Base
from backend.security import hash_password
from backend.models import User, Bus, Route, LocationLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexora.seed")

def seed_database():
    logger.info("Initializing NEXORA V1 Official Database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        pwd_hash = hash_password("Password123")

        # 1. Seed Exactly 1 Primary Corridor Route
        existing_route = db.query(Route).filter(Route.route_id == "Route 1").first()
        if not existing_route:
            # Flexible route stops - dynamic waypoints will be updated as driver moves
            stops = [
                {"stop_id": "S-01", "name": "Terminal Origin", "latitude": 0.0, "longitude": 0.0, "sequence": 1},
                {"stop_id": "S-02", "name": "Transit Station", "latitude": 0.0, "longitude": 0.0, "sequence": 2},
                {"stop_id": "S-03", "name": "City Destination", "latitude": 0.0, "longitude": 0.0, "sequence": 3}
            ]
            r = Route(
                route_id="Route 1",
                route_name="Route 1 - Primary Transit Corridor",
                start_point="Origin Terminal",
                end_point="City Destination",
                total_distance_km=10.0,
                stops_json=json.dumps(stops),
                path_json=json.dumps([[0.0, 0.0]])
            )
            db.add(r)
            logger.info("Seeded primary route: Route 1")

        # 2. Seed Exactly 1 of Each Core User Role
        # (Admin, Driver, Passenger, Responder)
        users_data = [
            {
                "user_code": "ADM-001",
                "name": "NEXORA Admin Host",
                "email": "admin@nexora.local",
                "role": "ADMIN",
                "phone": "+91 90000 00001"
            },
            {
                "user_code": "DRV-001",
                "name": "Transit Driver",
                "email": "driver@nexora.local",
                "role": "DRIVER",
                "phone": "+91 90000 00002"
            },
            {
                "user_code": "PAX-001",
                "name": "Commuter Passenger",
                "email": "passenger@nexora.local",
                "role": "PASSENGER",
                "phone": "+91 90000 00003"
            },
            {
                "user_code": "PAX-002",
                "name": "Commuter Passenger (Alt 1)",
                "email": "passenger1@nexora.local",
                "role": "PASSENGER",
                "phone": "+91 90000 00004"
            },
            {
                "user_code": "PAX-003",
                "name": "Commuter Passenger (Alt 2)",
                "email": "passenger2@nexora.local",
                "role": "PASSENGER",
                "phone": "+91 90000 00006"
            },
            {
                "user_code": "RSP-001",
                "name": "Emergency Responder",
                "email": "responder@nexora.local",
                "role": "RESPONDER",
                "phone": "+91 90000 00005"
            }
        ]

        for u in users_data:
            existing_user = db.query(User).filter(User.email == u["email"]).first()
            if not existing_user:
                # Also check user_code if available
                existing_user = db.query(User).filter(User.user_code == u["user_code"]).first()
            if not existing_user:
                new_user = User(
                    user_code=u["user_code"],
                    name=u["name"],
                    email=u["email"],
                    password_hash=pwd_hash,
                    role=u["role"],
                    phone=u["phone"],
                    is_active=True
                )
                db.add(new_user)
                logger.info(f"Seeded core user: {u['role']} ({u['email']})")
            else:
                existing_user.email = u["email"]
                existing_user.name = u["name"]
                existing_user.password_hash = pwd_hash
                existing_user.role = u["role"]
                existing_user.is_active = True
                existing_user.last_latitude = None
                existing_user.last_longitude = None
                logger.info(f"Updated core user: {u['role']} ({u['email']})")

        db.commit()

        # 3. Seed Exactly 1 Primary Bus (BUS-001)
        driver_user = db.query(User).filter(User.email == "driver@nexora.local").first()
        existing_bus = db.query(Bus).filter(Bus.bus_id == "BUS-001").first()
        if not existing_bus:
            bus = Bus(
                bus_id="BUS-001",
                registration_number="TN 38 BX 1001",
                driver_id=driver_user.id if driver_user else None,
                route_id="Route 1",
                status="IDLE",
                current_latitude=None,
                current_longitude=None,
                current_speed=0.0,
                last_updated=now
            )
            db.add(bus)
            logger.info("Seeded primary bus: BUS-001 (TN 38 BX 1001)")
        elif driver_user and not existing_bus.driver_id:
            existing_bus.driver_id = driver_user.id
            existing_bus.route_id = "Route 1"

        db.commit()
        logger.info("Database seeding complete!")
        logger.info("NEXORA V1 Official Single-Entity Access Credentials:")
        logger.info("  👑 Admin Host:  admin@nexora.local     | Password123")
        logger.info("  🚍 Driver:      driver@nexora.local    | Password123")
        logger.info("  📱 Passenger:   passenger@nexora.local | Password123")
        logger.info("  🚨 Responder:   responder@nexora.local | Password123")

    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
