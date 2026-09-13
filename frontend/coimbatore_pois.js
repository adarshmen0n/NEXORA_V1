// =========================================================
// NEXORA V1 — Coimbatore High-Detail POI Registry
// Comprehensive coverage of Hospitals, Police Stations,
// Fire & Rescue Departments, Schools/Colleges & Landmarks
// =========================================================

const COIMBATORE_POIS = [
    // -----------------------------------------------------
    // 0. COIMBATORE BUS STANDS & CENTRAL TRANSIT TERMINALS (8)
    // -----------------------------------------------------
    {
        id: "BS-01",
        category: "bus_stand",
        name: "Gandhipuram Town Bus Stand",
        type: "Primary Intra-City Transit Terminus (Town Bus Hub)",
        lat: 11.0168,
        lng: 76.9678,
        address: "Cross Cut Road, Gandhipuram, Coimbatore - 641012",
        phone: "0422 252 6112 / 1800 599 1500",
        icon: "🚏",
        color: "#059669",
        badge: "TNSTC City Bus Hub"
    },
    {
        id: "BS-02",
        category: "bus_stand",
        name: "Gandhipuram Central Bus Terminus (SETC / Express)",
        type: "State Inter-District & Inter-State Express Hub",
        lat: 11.0180,
        lng: 76.9685,
        address: "Dr. Nanjappa Road, Gandhipuram, Coimbatore - 641018",
        phone: "0422 252 1111 / SETC Enquiry",
        icon: "🚏",
        color: "#059669",
        badge: "SETC Express Hub"
    },
    {
        id: "BS-03",
        category: "bus_stand",
        name: "Gandhipuram Omni Bus Stand",
        type: "Inter-State AC Sleeper & Luxury Coach Terminal",
        lat: 11.0210,
        lng: 76.9710,
        address: "Sathyamangalam Road, GP Signal, Coimbatore - 641012",
        phone: "0422 249 8899",
        icon: "🚏",
        color: "#059669",
        badge: "Omni Sleeper Hub"
    },
    {
        id: "BS-04",
        category: "bus_stand",
        name: "Ukkadam Bus Terminus",
        type: "South Hub (Pollachi, Palakkad, Valparai, Anaimalai)",
        lat: 10.9875,
        lng: 76.9615,
        address: "Ukkadam Bypass Road, Near Periyakulam, Coimbatore - 641001",
        phone: "0422 239 8811",
        icon: "🚏",
        color: "#059669",
        badge: "South Corridor Hub"
    },
    {
        id: "BS-05",
        category: "bus_stand",
        name: "Singanallur Bus Terminal",
        type: "East Hub (Madurai, Trichy, Thanjavur, Karur, Dindigul)",
        lat: 10.9980,
        lng: 77.0245,
        address: "Trichy Road, Singanallur, Coimbatore - 641005",
        phone: "0422 257 6622",
        icon: "🚏",
        color: "#059669",
        badge: "Trichy Highway Hub"
    },
    {
        id: "BS-06",
        category: "bus_stand",
        name: "Mettupalayam Road Bus Stand (Saibaba Colony)",
        type: "Nilgiris Mountain Route (Ooty, Coonoor, Kotagiri)",
        lat: 11.0315,
        lng: 76.9480,
        address: "Mettupalayam Road, Saibaba Colony, Coimbatore - 641043",
        phone: "0422 244 5511",
        icon: "🚏",
        color: "#059669",
        badge: "Nilgiris Gateway"
    },
    {
        id: "BS-07",
        category: "bus_stand",
        name: "Sulur Bus Terminus",
        type: "Eastern Metropolitan Link (Tirupur, Kangeyam, Palladam)",
        lat: 11.0250,
        lng: 77.1260,
        address: "Trichy Main Road, Sulur, Coimbatore - 641402",
        phone: "0422 268 7200",
        icon: "🚏",
        color: "#059669",
        badge: "East Outer Hub"
    },
    {
        id: "BS-08",
        category: "bus_stand",
        name: "Vadavalli Bus Stand",
        type: "West Hub (Maruthamalai Temple, Bharathiar University)",
        lat: 11.0280,
        lng: 76.9020,
        address: "Maruthamalai Main Road, Vadavalli, Coimbatore - 641041",
        phone: "0422 242 2211",
        icon: "🚏",
        color: "#059669",
        badge: "West Temple Hub"
    },

    // -----------------------------------------------------
    // 1. HOSPITALS & EMERGENCY TRAUMA CENTERS (12)
    // -----------------------------------------------------
    {
        id: "HOSP-01",
        category: "hospital",
        name: "Coimbatore Medical College Hospital (CMCH)",
        type: "State Govt Premier Multi-Speciality & Trauma Care",
        lat: 11.0006,
        lng: 76.9667,
        address: "Trichy Road, Gopalapuram, Town Hall, Coimbatore - 641018",
        phone: "0422 230 1393 / 108 Emergency",
        icon: "🏥",
        color: "#dc2626",
        badge: "Govt Medical Emergency"
    },
    {
        id: "HOSP-02",
        category: "hospital",
        name: "Kovai Medical Center & Hospital (KMCH)",
        type: "Super Speciality & Multi-Organ Transplant Center",
        lat: 11.0425,
        lng: 77.0392,
        address: "99, Avinashi Road, Peelamedu, Civil Aerodrome, Coimbatore - 641014",
        phone: "0422 432 3800 / 0422 262 7784",
        icon: "🏥",
        color: "#dc2626",
        badge: "Super Speciality"
    },
    {
        id: "HOSP-03",
        category: "hospital",
        name: "PSG Hospitals & Super Speciality",
        type: "Multi-Speciality & Academic Tertiary Center",
        lat: 11.0264,
        lng: 77.0028,
        address: "Avinashi Road, Peelamedu, Coimbatore - 641004",
        phone: "0422 257 0170 / 0422 434 5353",
        icon: "🏥",
        color: "#dc2626",
        badge: "Tertiary Care"
    },
    {
        id: "HOSP-04",
        category: "hospital",
        name: "Ganga Hospital (Trauma & Orthopaedics)",
        type: "World-Class Trauma, Orthopaedic & Microsurgery Center",
        lat: 11.0185,
        lng: 76.9535,
        address: "313, Mettupalayam Road, Swarnambika Layout, Coimbatore - 641043",
        phone: "0422 248 5000 / 0422 425 0000",
        icon: "🏥",
        color: "#dc2626",
        badge: "Trauma Center"
    },
    {
        id: "HOSP-05",
        category: "hospital",
        name: "Sri Ramakrishna Hospital",
        type: "Tertiary Multi-Speciality & Cancer Institute",
        lat: 11.0253,
        lng: 76.9822,
        address: "395, Sarojini Naidu Road, Sidhapudur, Coimbatore - 641044",
        phone: "0422 450 0000 / 0422 224 6541",
        icon: "🏥",
        color: "#dc2626",
        badge: "Critical Care"
    },
    {
        id: "HOSP-06",
        category: "hospital",
        name: "G. Kuppuswamy Naidu Memorial Hospital (GKNM)",
        type: "Cardiac & Multi-Speciality Tertiary Care",
        lat: 11.0152,
        lng: 76.9829,
        address: "Pappanaickenpalayam, Coimbatore - 641037",
        phone: "0422 432 4444 / 0422 224 5000",
        icon: "🏥",
        color: "#dc2626",
        badge: "Cardiac & General"
    },
    {
        id: "HOSP-07",
        category: "hospital",
        name: "Royal Care Super Speciality Hospital",
        type: "Comprehensive Emergency & Stroke Center",
        lat: 11.0634,
        lng: 77.0864,
        address: "1/520, L&T Bypass Road, Neelambur, Coimbatore - 641062",
        phone: "0422 222 7000 / 0422 222 7444",
        icon: "🏥",
        color: "#dc2626",
        badge: "Stroke & Trauma"
    },
    {
        id: "HOSP-08",
        category: "hospital",
        name: "Gem Hospital & Research Centre",
        type: "Gastroenterology, Laparoscopy & Surgical Center",
        lat: 10.9944,
        lng: 76.9947,
        address: "45, Pankaja Mill Road, Ramanathapuram, Coimbatore - 641045",
        phone: "0422 232 5100 / 0422 451 5100",
        icon: "🏥",
        color: "#dc2626",
        badge: "Speciality Surgery"
    },
    {
        id: "HOSP-09",
        category: "hospital",
        name: "Government Hospital Sundarapuram",
        type: "District Urban Community Health Center",
        lat: 10.9525,
        lng: 76.9740,
        address: "Pollachi Main Road, Sundarapuram, Coimbatore - 641024",
        phone: "0422 267 2200",
        icon: "🏥",
        color: "#dc2626",
        badge: "Community Health"
    },
    {
        id: "HOSP-10",
        category: "hospital",
        name: "The Eye Foundation Super Speciality",
        type: "Ophthalmic Surgical Hospital",
        lat: 11.0078,
        lng: 76.9482,
        address: "582A, DB Road, R.S. Puram, Coimbatore - 641002",
        phone: "0422 424 2000",
        icon: "🏥",
        color: "#dc2626",
        badge: "Eye Care"
    },
    {
        id: "HOSP-11",
        category: "hospital",
        name: "Masonic Medical Centre for Children",
        type: "Paediatric Hospital & Special Care",
        lat: 11.0021,
        lng: 76.9754,
        address: "Race Course Road, Race Course, Coimbatore - 641018",
        phone: "0422 221 4455",
        icon: "🏥",
        color: "#dc2626",
        badge: "Child Emergency"
    },

    // -----------------------------------------------------
    // 2. FIRE ENGINE & RESCUE STATIONS (6)
    // -----------------------------------------------------
    {
        id: "FIRE-01",
        category: "fire",
        name: "Coimbatore South Fire & Rescue Station",
        type: "Headquarters Fire & Disaster Response",
        lat: 10.9972,
        lng: 76.9664,
        address: "State Bank Road, Near Collectorate, Town Hall, Coimbatore - 641018",
        phone: "101 / 0422 230 0101",
        icon: "🚒",
        color: "#ea580c",
        badge: "HQ Fire Dispatch"
    },
    {
        id: "FIRE-02",
        category: "fire",
        name: "Coimbatore North Fire & Rescue Station",
        type: "Urban Fire & Rescue Response Unit",
        lat: 11.0412,
        lng: 76.9421,
        address: "Mettupalayam Road, Kavundampalayam, Coimbatore - 641030",
        phone: "101 / 0422 244 0101",
        icon: "🚒",
        color: "#ea580c",
        badge: "North Fire Unit"
    },
    {
        id: "FIRE-03",
        category: "fire",
        name: "Peelamedu Fire & Rescue Station",
        type: "Airport & Industrial Corridor Fire Station",
        lat: 11.0345,
        lng: 77.0210,
        address: "Avinashi Road, Peelamedu, Coimbatore - 641004",
        phone: "101 / 0422 257 0101",
        icon: "🚒",
        color: "#ea580c",
        badge: "Avinashi Corridor"
    },
    {
        id: "FIRE-04",
        category: "fire",
        name: "Ganapathy Fire & Rescue Station",
        type: "Sathy Road Sector Fire & Rescue Post",
        lat: 11.0385,
        lng: 76.9820,
        address: "Sathy Main Road, Ganapathy, Coimbatore - 641006",
        phone: "101 / 0422 253 0101",
        icon: "🚒",
        color: "#ea580c",
        badge: "Ganapathy Sector"
    },
    {
        id: "FIRE-05",
        category: "fire",
        name: "Singanallur Fire & Rescue Station",
        type: "Trichy Road & Industrial Area Rescue",
        lat: 10.9982,
        lng: 77.0285,
        address: "Trichy Road, Singanallur, Coimbatore - 641005",
        phone: "101 / 0422 259 5101",
        icon: "🚒",
        color: "#ea580c",
        badge: "Trichy Corridor"
    },
    {
        id: "FIRE-06",
        category: "fire",
        name: "Kovaipudur Fire & Rescue Outpost",
        type: "South-West Hill & Residential Rescue Post",
        lat: 10.9325,
        lng: 76.9412,
        address: "Kovaipudur Main Road, Coimbatore - 641042",
        phone: "101 / 0422 260 5101",
        icon: "🚒",
        color: "#ea580c",
        badge: "Suburban Rescue"
    },

    // -----------------------------------------------------
    // 3. POLICE STATIONS & COMMISSIONERATE (11)
    // -----------------------------------------------------
    {
        id: "POL-01",
        category: "police",
        name: "Coimbatore City Police Commissionerate",
        type: "Metropolitan Police Headquarters & Control Room",
        lat: 11.0039,
        lng: 76.9689,
        address: "Huzur Road, Uppilipalayam, Coimbatore - 641018",
        phone: "100 / 0422 230 0250",
        icon: "🚓",
        color: "#2563eb",
        badge: "City HQ Command"
    },
    {
        id: "POL-02",
        category: "police",
        name: "B1 Police Station (Town Hall / Big Bazaar)",
        type: "Law & Order Station - Central City",
        lat: 10.9958,
        lng: 76.9619,
        address: "Big Bazaar Street, Town Hall, Coimbatore - 641001",
        phone: "0422 239 0100",
        icon: "🚓",
        color: "#2563eb",
        badge: "Town Hall Sector"
    },
    {
        id: "POL-03",
        category: "police",
        name: "B2 R.S. Puram Police Station",
        type: "Law & Order Station - Commercial Hub",
        lat: 11.0089,
        lng: 76.9501,
        address: "Diwan Bahadur (DB) Road, R.S. Puram, Coimbatore - 641002",
        phone: "0422 255 0100",
        icon: "🚓",
        color: "#2563eb",
        badge: "RS Puram Sector"
    },
    {
        id: "POL-04",
        category: "police",
        name: "B3 Kattoor / Gandhipuram Police Station",
        type: "Law & Order Station - Bus Terminus District",
        lat: 11.0175,
        lng: 76.9682,
        address: "Sathy Road, Gandhipuram, Coimbatore - 641012",
        phone: "0422 223 0100",
        icon: "🚓",
        color: "#2563eb",
        badge: "Gandhipuram Sector"
    },
    {
        id: "POL-05",
        category: "police",
        name: "B4 Ukkadam Police Station",
        type: "Transit Hub & Lake Sector Law Enforcement",
        lat: 10.9882,
        lng: 76.9625,
        address: "Palakkad Main Road, Ukkadam, Coimbatore - 641001",
        phone: "0422 239 5100",
        icon: "🚓",
        color: "#2563eb",
        badge: "Ukkadam Sector"
    },
    {
        id: "POL-06",
        category: "police",
        name: "E1 Singanallur Police Station",
        type: "Law & Order Station - Industrial / Trichy Rd",
        lat: 10.9996,
        lng: 77.0258,
        address: "Trichy Road, Singanallur, Coimbatore - 641005",
        phone: "0422 257 2100",
        icon: "🚓",
        color: "#2563eb",
        badge: "Singanallur Sector"
    },
    {
        id: "POL-07",
        category: "police",
        name: "B11 Peelamedu Police Station",
        type: "Avinashi Road & Educational Corridor",
        lat: 11.0315,
        lng: 77.0182,
        address: "Hope College, Avinashi Road, Peelamedu, Coimbatore - 641004",
        phone: "0422 257 1100",
        icon: "🚓",
        color: "#2563eb",
        badge: "Peelamedu Sector"
    },
    {
        id: "POL-08",
        category: "police",
        name: "B8 Saravanampatti Police Station",
        type: "IT Corridor & Sathy Road Police Station",
        lat: 11.0772,
        lng: 76.9984,
        address: "Sathy Main Road, Saravanampatti, Coimbatore - 641035",
        phone: "0422 266 6100",
        icon: "🚓",
        color: "#2563eb",
        badge: "IT Corridor Sector"
    },
    {
        id: "POL-09",
        category: "police",
        name: "C1 Kuniyamuthur Police Station",
        type: "Palakkad Highway Law Enforcement",
        lat: 10.9620,
        lng: 76.9580,
        address: "Palakkad Main Road, Kuniyamuthur, Coimbatore - 641008",
        phone: "0422 225 0100",
        icon: "🚓",
        color: "#2563eb",
        badge: "Kuniyamuthur Sector"
    },
    {
        id: "POL-10",
        category: "police",
        name: "C2 Vadavalli Police Station",
        type: "Marudhamalai Road Police Station",
        lat: 11.0260,
        lng: 76.9080,
        address: "Marudhamalai Main Road, Vadavalli, Coimbatore - 641041",
        phone: "0422 242 2100",
        icon: "🚓",
        color: "#2563eb",
        badge: "Vadavalli Sector"
    },
    {
        id: "POL-11",
        category: "police",
        name: "Traffic Police Control Room (PRS)",
        type: "City Traffic Command & Emergency Highway Patrol",
        lat: 11.0028,
        lng: 76.9715,
        address: "Dr. Balasundaram Road, PRS Grounds, Coimbatore - 641018",
        phone: "103 / 0422 230 0970",
        icon: "🚓",
        color: "#2563eb",
        badge: "Traffic Control"
    },

    // -----------------------------------------------------
    // 4. SCHOOLS, COLLEGES & UNIVERSITIES (11)
    // -----------------------------------------------------
    {
        id: "EDU-01",
        category: "school",
        name: "PSG College of Technology",
        type: "Premier Autonomous Engineering Institution",
        lat: 11.0245,
        lng: 77.0032,
        address: "Avinashi Road, Peelamedu, Coimbatore - 641004",
        phone: "0422 257 2177",
        icon: "🎓",
        color: "#9333ea",
        badge: "Autonomous College"
    },
    {
        id: "EDU-02",
        category: "school",
        name: "Coimbatore Institute of Technology (CIT)",
        type: "Government-Aided Autonomous Institution",
        lat: 11.0289,
        lng: 77.0278,
        address: "Avinashi Road, Civil Aerodrome Post, Peelamedu, Coimbatore - 641014",
        phone: "0422 257 4071",
        icon: "🎓",
        color: "#9333ea",
        badge: "Autonomous College"
    },
    {
        id: "EDU-03",
        category: "school",
        name: "Government College of Technology (GCT)",
        type: "Premier State Government Engineering College",
        lat: 11.0188,
        lng: 76.9328,
        address: "Thadagam Road, Coimbatore - 641013",
        phone: "0422 243 2221",
        icon: "🎓",
        color: "#9333ea",
        badge: "Govt Engineering"
    },
    {
        id: "EDU-04",
        category: "school",
        name: "Stanes Anglo-Indian Higher Secondary School",
        type: "Historic School (Estd 1862)",
        lat: 11.0102,
        lng: 76.9742,
        address: "1044, Avinashi Road, Near LIC, Coimbatore - 641018",
        phone: "0422 221 3462",
        icon: "🎓",
        color: "#9333ea",
        badge: "Higher Secondary"
    },
    {
        id: "EDU-05",
        category: "school",
        name: "Avila Convent Matriculation Higher Secondary",
        type: "Premier Higher Secondary School for Girls",
        lat: 11.0240,
        lng: 76.9380,
        address: "Venkitapuram, Saibaba Colony, Coimbatore - 641043",
        phone: "0422 243 8595",
        icon: "🎓",
        color: "#9333ea",
        badge: "Higher Secondary"
    },
    {
        id: "EDU-06",
        category: "school",
        name: "St. Michael's Higher Secondary School",
        type: "Heritage Boys Higher Secondary School",
        lat: 10.9950,
        lng: 76.9650,
        address: "Big Bazaar Street, Town Hall, Coimbatore - 641001",
        phone: "0422 239 1234",
        icon: "🎓",
        color: "#9333ea",
        badge: "Higher Secondary"
    },
    {
        id: "EDU-07",
        category: "school",
        name: "G.D. Matriculation Higher Secondary School",
        type: "Reputed Model Matriculation Institution",
        lat: 11.0055,
        lng: 76.9720,
        address: "Gopalapuram, Near Nehru Stadium, Coimbatore - 641018",
        phone: "0422 221 0055",
        icon: "🎓",
        color: "#9333ea",
        badge: "Higher Secondary"
    },
    {
        id: "EDU-08",
        category: "school",
        name: "Lisieux Matriculation Higher Secondary School",
        type: "Senior Secondary School for Boys",
        lat: 11.0305,
        lng: 76.9450,
        address: "NSR Road, Saibaba Colony, Coimbatore - 641011",
        phone: "0422 244 0463",
        icon: "🎓",
        color: "#9333ea",
        badge: "Higher Secondary"
    },
    {
        id: "EDU-09",
        category: "school",
        name: "Bishop Appasamy College of Arts & Science",
        type: "Autonomous Arts & Science College",
        lat: 11.0012,
        lng: 76.9765,
        address: "129, Race Course Road, Coimbatore - 641018",
        phone: "0422 222 1840",
        icon: "🎓",
        color: "#9333ea",
        badge: "Arts & Science"
    },
    {
        id: "EDU-10",
        category: "school",
        name: "Kumaraguru College of Technology (KCT)",
        type: "Premier Engineering Campus & Tech Park",
        lat: 11.0795,
        lng: 76.9920,
        address: "Chinnavedampatti, Saravanampatti, Coimbatore - 641049",
        phone: "0422 266 9401",
        icon: "🎓",
        color: "#9333ea",
        badge: "Tech Campus"
    },
    {
        id: "EDU-11",
        category: "school",
        name: "Nirmala College for Women",
        type: "Autonomous College for Women",
        lat: 10.9995,
        lng: 76.9840,
        address: "Red Fields, Sungam, Coimbatore - 641018",
        phone: "0422 222 3469",
        icon: "🎓",
        color: "#9333ea",
        badge: "Women's College"
    },

    // -----------------------------------------------------
    // 5. STADIUMS, THEATERS, MALLS & LANDMARKS (11)
    // -----------------------------------------------------
    {
        id: "LM-01",
        category: "landmark",
        name: "Nehru Stadium Coimbatore",
        type: "Major Metropolitan Athletics & Football Stadium",
        lat: 11.0058,
        lng: 76.9712,
        address: "V.O.C. Park Grounds, Gopalapuram, Coimbatore - 641018",
        phone: "0422 221 3344",
        icon: "🏟️",
        color: "#059669",
        badge: "City Stadium"
    },
    {
        id: "LM-02",
        category: "landmark",
        name: "V.O.C. Park & Exhibition Grounds",
        type: "Central Public Park, Zoo & Cultural Exhibition Arena",
        lat: 11.0075,
        lng: 76.9730,
        address: "Park Gate, Gopalapuram, Coimbatore - 641018",
        phone: "0422 221 2844",
        icon: "🌳",
        color: "#059669",
        badge: "Central Park"
    },
    {
        id: "LM-03",
        category: "landmark",
        name: "Coimbatore Junction Railway Station (CBE)",
        type: "Major A1 Category Southern Railway Terminus",
        lat: 10.9983,
        lng: 76.9642,
        address: "State Bank Road, Gopalapuram, Coimbatore - 641018",
        phone: "139 / 0422 230 2270",
        icon: "🚆",
        color: "#059669",
        badge: "Railway Terminus"
    },
    {
        id: "LM-04",
        category: "landmark",
        name: "Gandhipuram Central Bus Terminus",
        type: "Primary Inter-City & Intra-City Transit Hub",
        lat: 11.0168,
        lng: 76.9678,
        address: "Cross Cut Road, Gandhipuram, Coimbatore - 641012",
        phone: "0422 252 6112",
        icon: "🚏",
        color: "#059669",
        badge: "Bus Terminus"
    },
    {
        id: "LM-05",
        category: "landmark",
        name: "Brookefields Mall & Broadway Cinemas",
        type: "Multi-Screen Plex, Shopping Mall & Entertainment",
        lat: 11.0125,
        lng: 76.9585,
        address: "67-71, Krishnasamy Road, Brookebond Road, Coimbatore - 641001",
        phone: "0422 225 5555",
        icon: "🎬",
        color: "#059669",
        badge: "Mall & Cinema"
    },
    {
        id: "LM-06",
        category: "landmark",
        name: "Prozone Mall & INOX Cinemas",
        type: "Mega Shopping Mall & 9-Screen INOX Multiplex",
        lat: 11.0558,
        lng: 76.9942,
        address: "Sathy Main Road, Saravanampatti, Coimbatore - 641035",
        phone: "0422 662 8888",
        icon: "🎬",
        color: "#059669",
        badge: "Mega Multiplex"
    },
    {
        id: "LM-07",
        category: "landmark",
        name: "Fun Republic Mall & Cinépolis",
        type: "Commercial Mall & Multi-Screen Cinema",
        lat: 11.0285,
        lng: 77.0120,
        address: "Avinashi Road, Peelamedu, Coimbatore - 641004",
        phone: "0422 452 9000",
        icon: "🎬",
        color: "#059669",
        badge: "Multiplex"
    },
    {
        id: "LM-08",
        category: "landmark",
        name: "KG Cinemas (4K Laser Projection)",
        type: "Famous Heritage Cinema Multiplex",
        lat: 11.0040,
        lng: 76.9630,
        address: "Bungalow Road, Town Hall, Coimbatore - 641018",
        phone: "0422 230 3388",
        icon: "🍿",
        color: "#059669",
        badge: "Cinema"
    },
    {
        id: "LM-09",
        category: "landmark",
        name: "Coimbatore International Airport (CJB)",
        type: "International Airport & Cargo Terminal",
        lat: 11.0300,
        lng: 77.0434,
        address: "Airport Road, Peelamedu, Coimbatore - 641014",
        phone: "0422 259 2155",
        icon: "✈️",
        color: "#059669",
        badge: "Intl Airport"
    },
    {
        id: "LM-10",
        category: "landmark",
        name: "Ukkadam Bus Terminus & Periyakulam Lake",
        type: "Inter-District Transport & Eco-Tourism Front",
        lat: 10.9875,
        lng: 76.9615,
        address: "Ukkadam Bypass Road, Coimbatore - 641001",
        phone: "0422 239 8811",
        icon: "🚏",
        color: "#059669",
        badge: "Transit & Lake"
    },
    {
        id: "LM-11",
        category: "landmark",
        name: "Singanallur Bus Terminal & Boat House Lake",
        type: "Trichy Corridor Bus Hub & Biodiversity Reserve",
        lat: 10.9980,
        lng: 77.0245,
        address: "Trichy Road, Singanallur, Coimbatore - 641005",
        phone: "0422 257 6622",
        icon: "🚏",
        color: "#059669",
        badge: "Transit Hub"
    }
];

// Helper to create high-detail Google-styled POI markers
function createPOIMarker(poi, map) {
    const iconHtml = `
        <div class="poi-marker-badge" style="
            background: ${poi.color};
            color: white;
            padding: 3px 6px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -100%);
        ">
            <span>${poi.icon}</span>
            <span>${poi.name.split(" ")[0]}</span>
        </div>
    `;

    const customIcon = L.divIcon({
        className: "poi-custom-div-icon",
        html: iconHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });

    const marker = L.marker([poi.lat, poi.lng], { icon: customIcon });

    const popupContent = `
        <div style="min-width: 220px; font-family: 'Inter', sans-serif; color: #111;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 1.2rem;">${poi.icon}</span>
                <strong style="font-size: 0.95rem; color: #111827;">${poi.name}</strong>
            </div>
            <div style="display: inline-block; background: ${poi.color}20; color: ${poi.color}; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase;">
                ${poi.badge}
            </div>
            <div style="font-size: 0.8rem; color: #4b5563; margin-bottom: 6px; line-height: 1.3;">
                📍 ${poi.address}
            </div>
            <div style="font-size: 0.8rem; font-weight: 600; color: #1f2937; margin-bottom: 8px;">
                📞 <a href="tel:${poi.phone.split(' ')[0]}" style="color: #2563eb; text-decoration: none;">${poi.phone}</a>
            </div>
            <div style="font-size: 0.75rem; color: #6b7280; font-style: italic;">
                ${poi.type}
            </div>
        </div>
    `;

    marker.bindPopup(popupContent);
    return marker;
}
