import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("explorex.db");

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS DESTINATIONS (
    dest_id INTEGER PRIMARY KEY AUTOINCREMENT,
    place TEXT NOT NULL,
    state TEXT,
    vibe TEXT,
    day_cost REAL,
    ev_fee REAL,
    resort TEXT,
    green_score INTEGER,
    insight TEXT,
    image_url TEXT,
    history_prime TEXT
  );

  CREATE TABLE IF NOT EXISTS TRIBAL_STAYS (
    stay_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tribe_name TEXT NOT NULL,
    location TEXT NOT NULL,
    eco_rating REAL,
    capacity INTEGER,
    cultural_activities TEXT,
    price_per_night REAL,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS BOOKINGS (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    stay_id INTEGER,
    duration INTEGER,
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(stay_id) REFERENCES TRIBAL_STAYS(stay_id)
  );

  CREATE TABLE IF NOT EXISTS GUIDES (
    guide_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'EV',
    certification_status TEXT,
    language TEXT,
    rating REAL,
    price_per_hour REAL
  );

  CREATE TABLE IF NOT EXISTS LOCAL_PRODUCTS (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    artisan_name TEXT,
    eco_category TEXT,
    price REAL,
    region TEXT,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS LIVE_TRACKING (
    tracking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS EMERGENCY_ALERTS (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'PENDING',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Destinations
const destCount = db.prepare("SELECT count(*) as count FROM DESTINATIONS").get() as { count: number };
// Force re-seed to update images and data
db.prepare("DELETE FROM DESTINATIONS").run();

const insertDest = db.prepare("INSERT INTO DESTINATIONS (place, state, vibe, day_cost, ev_fee, resort, green_score, insight, image_url, history_prime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
const destinations = [
  ["Tirupati", "Andhra Pradesh", "Devotional", 1500, 200, "Seshachalam Eco Lodge", 95, "The spiritual capital of Andhra Pradesh, famous for the Sri Venkateswara Temple.", "https://images.unsplash.com/photo-1621360841013-c7683c659ec6?auto=format&fit=crop&q=80&w=800", "In the 9th century, the temple was a modest stone structure surrounded by dense forests."],
  ["Varanasi", "Uttar Pradesh", "Devotional", 1000, 150, "Ganges Green Camp", 90, "One of the oldest living cities, offering spiritual ghats and temples.", "https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&q=80&w=800", "The eternal city where the smoke of pyres has risen for millennia."],
  ["Taj Mahal", "Uttar Pradesh", "History", 2000, 300, "Mughal Eco Resort", 85, "An ivory-white marble mausoleum and an architectural masterpiece.", "https://images.unsplash.com/photo-1564507592333-c60657ece523?auto=format&fit=crop&q=80&w=800", "A monument of love that once stood amidst lush Charbagh gardens."],
  ["Hampi", "Karnataka", "History", 1200, 200, "Vijayanagara Heritage Hut", 93, "Ancient village with ruins of temples from the Vijayanagara Empire.", "https://images.unsplash.com/photo-1581330152515-b4ff0a20564a?auto=format&fit=crop&q=80&w=800", "The capital of the Vijayanagara Empire, where gold was traded on the streets."],
  ["Goa Beaches", "Goa", "Enjoyment", 3000, 400, "Palolem Green Villas", 80, "Famous for beautiful beaches, vibrant nightlife, and Portuguese architecture.", "https://images.unsplash.com/photo-1512789172734-8b09f9d3c014?auto=format&fit=crop&q=80&w=800", "A serene coastline of untouched sands where the only music was the sea."],
  ["Pondicherry", "Puducherry", "Enjoyment", 2500, 300, "Auroville Eco Retreat", 87, "French colonial heritage with serene beaches and vibrant cafes.", "https://images.unsplash.com/photo-1582512390368-6f4a395e5ffe?auto=format&fit=crop&q=80&w=800", "A quiet French outpost where the smell of fresh baguettes mingled with the sea."],
  ["Munnar", "Kerala", "Enjoyment", 2200, 250, "Tea Valley Green Resort", 92, "Rolling hills of tea plantations and mist-covered valleys.", "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&q=80&w=800", "Before the plantations, these hills were a solid canopy of Neelakurinji flowers."],
  ["Alleppey", "Kerala", "Tradition", 1800, 200, "Backwater Eco Houseboats", 94, "Known for backwater cruising and traditional Kerala houseboats.", "https://images.unsplash.com/photo-1593693411515-c202e974fe08?auto=format&fit=crop&q=80&w=800", "A network of waterways where life moved at the pace of a wooden oar."],
  ["Jaipur", "Rajasthan", "History", 1500, 250, "Aravali Eco Palace", 89, "A majestic fort offering a glimpse into the opulent Rajput era.", "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=800", "The Pink City's crown jewel, gleaming under the desert sun."],
  ["Udaipur", "Rajasthan", "Enjoyment", 3500, 500, "Lake Pichola Green Haveli", 86, "The City of Lakes with luxurious palaces and romantic boat rides.", "https://images.unsplash.com/photo-1585135497273-1a85b09fe707?auto=format&fit=crop&q=80&w=800", "The Venice of the East, where palaces float on shimmering waters."],
  ["Jaisalmer", "Rajasthan", "History", 2000, 350, "Thar Eco Camp", 91, "The Golden City known for its stunning desert fort and camel safaris.", "https://images.unsplash.com/photo-1590050752117-23a9d7fc6bbd?auto=format&fit=crop&q=80&w=800", "A golden fortress rising from the heart of the Thar Desert."],
  ["Srinagar", "Jammu and Kashmir", "Enjoyment", 3000, 400, "Kashmir Eco Shikara", 88, "The summer capital famous for Dal Lake and scenic Mughal gardens.", "https://images.unsplash.com/photo-1566833925202-d285e41399a7?auto=format&fit=crop&q=80&w=800", "The Mughal gardens once echoed with the poetry of emperors."],
  ["Gulmarg", "Jammu and Kashmir", "Enjoyment", 4000, 500, "Himalayan Green Ski Resort", 84, "A popular skiing destination with snow-capped peaks and meadows.", "https://images.unsplash.com/photo-1589308454676-65488f86806e?auto=format&fit=crop&q=80&w=800", "The meadow of flowers, now a winter wonderland of pristine snow."],
  ["Rishikesh", "Uttarakhand", "Devotional", 1200, 150, "Ganga Serene Eco Camp", 96, "The Yoga Capital of the World, offering spiritual peace and adventure.", "https://images.unsplash.com/photo-1598970434722-5c4c4421c1e8?auto=format&fit=crop&q=80&w=800", "Where the holy Ganges descends from the Himalayas into the plains."],
  ["Kedarnath", "Uttarakhand", "Devotional", 2500, 400, "Shiva Eco Domes", 97, "A revered Hindu pilgrimage site situated amidst the high Himalayas.", "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&q=80&w=800", "A sacred sanctuary standing strong against the elements for centuries."],
  ["Badrinath", "Uttarakhand", "Devotional", 2500, 400, "Narayana Eco Stays", 95, "Another crucial stop in the Char Dham Yatra, dedicated to Lord Vishnu.", "https://images.unsplash.com/photo-1617653202545-931490e8d7e7?auto=format&fit=crop&q=80&w=800", "The bright abode of Lord Vishnu, nestled between Nar and Narayan peaks."],
  ["Konark", "Odisha", "History", 1000, 100, "Kalinga Heritage Lodge", 92, "A 13th-century Sun Temple known for intricate chariot carvings.", "https://images.unsplash.com/photo-1609137144813-906963e635c0?auto=format&fit=crop&q=80&w=800", "A colossal chariot of the Sun God, frozen in stone for eternity."],
  ["Puri", "Odisha", "Devotional", 1200, 100, "Eastern Ghat Eco Stay", 93, "Famous for the Rath Yatra and the deeply revered Jagannath Temple.", "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&q=80&w=800", "The spiritual heart of Odisha, where the Lord of the Universe resides."],
  ["Rameshwaram", "Tamil Nadu", "Devotional", 1200, 150, "Gulf of Mannar Green Stay", 94, "A holy island town known for the Ramanathaswamy Temple.", "https://images.unsplash.com/photo-1605649440419-46f3c453482b?auto=format&fit=crop&q=80&w=800", "The bridge between the mainland and the divine, sanctified by Lord Rama."],
  ["Madurai", "Tamil Nadu", "Devotional", 1000, 100, "Madurai Eco Heritage", 91, "A historic temple complex in Madurai with magnificent colorful gopurams.", "https://images.unsplash.com/photo-1621360841013-c7683c659ec6?auto=format&fit=crop&q=80&w=800", "A vibrant masterpiece of Dravidian architecture, pulsing with life."],
  ["Mahabalipuram", "Tamil Nadu", "History", 1200, 150, "Coromandel Eco Resort", 90, "UNESCO World Heritage site with ancient rock-cut temples and monuments.", "https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&q=80&w=800", "The shore temple where the waves of the Bay of Bengal meet ancient stone."],
  ["Mysore", "Karnataka", "History", 1500, 200, "Wadiyar Royal Eco Retreat", 88, "The spectacularly grand palace, illuminated beautifully on weekends.", "https://images.unsplash.com/photo-1590733455785-f18519f59218?auto=format&fit=crop&q=80&w=800", "The seat of the Wadiyars, a symphony of Indo-Saracenic architecture."],
  ["Bodh Gaya", "Bihar", "Devotional", 1000, 150, "Bodhi Tree Green Stays", 98, "The holy site where Lord Buddha attained enlightenment.", "https://images.unsplash.com/photo-1612438214708-f428a707dd4e?auto=format&fit=crop&q=80&w=800", "The peaceful sanctuary where the light of wisdom first dawned."],
  ["Nalanda", "Bihar", "History", 800, 100, "Ancient Wisdom Eco Lodge", 94, "The ruins of one of the world's oldest universities.", "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?auto=format&fit=crop&q=80&w=800", "The ancient beacon of knowledge that drew scholars from across the globe."],
  ["Khajuraho", "Madhya Pradesh", "History", 1800, 250, "Vindhya Heritage Resort", 87, "Famous for its breathtaking collection of ancient temples with exquisite carvings.", "https://images.unsplash.com/photo-1611672585731-fa10603fb9e0?auto=format&fit=crop&q=80&w=800", "A celebration of life and divinity etched in the stones of Central India."],
  ["Sanchi", "Madhya Pradesh", "History", 1000, 150, "Mauryan Green Haven", 95, "A well-preserved core of Buddhist architecture from the Mauryan period.", "https://images.unsplash.com/photo-1599139331401-5882d02f33bc?auto=format&fit=crop&q=80&w=800", "The serene dome of peace, commissioned by Emperor Ashoka the Great."],
  ["Ajanta", "Maharashtra", "History", 1200, 200, "Sahyadri Rock Eco Retreat", 92, "Ancient rock-cut caves featuring masterpieces of Buddhist religious art.", "https://images.unsplash.com/photo-1594484208280-efa00f9e990c?auto=format&fit=crop&q=80&w=800", "A hidden gallery of ancient murals and sculptures in the Sahyadri hills."],
  ["Ellora", "Maharashtra", "History", 1200, 200, "Deccan Heritage Camp", 93, "A mix of Hindu, Buddhist, and Jain rock-cut temples, including the Kailasanatha Temple.", "https://images.unsplash.com/photo-1606507949467-23067c44200b?auto=format&fit=crop&q=80&w=800", "The pinnacle of rock-cut architecture, carved from a single mountain."],
  ["Mumbai", "Maharashtra", "Enjoyment", 4000, 500, "Arabian Sea Eco Towers", 75, "The 'Queen's Necklace', a lively promenade offering stunning sunset views.", "https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&q=80&w=800", "The glittering crescent of Mumbai, where the city meets the sea."],
  ["Havelock", "Andaman", "Enjoyment", 4500, 600, "Radhanagar Green Cove", 85, "Pristine beaches with crystal-clear waters, perfect for scuba diving.", "https://images.unsplash.com/photo-1589394815804-964ed9be2eb3?auto=format&fit=crop&q=80&w=800", "The emerald islands of the Bay of Bengal, a paradise for explorers."],
  ["Kaziranga", "Assam", "Enjoyment", 2500, 400, "Rhino Eco Safari Lodge", 96, "A biodiversity hotspot famously home to the one-horned rhinoceros.", "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&q=80&w=800", "The wild heart of Assam, where the rhino reigns supreme in the tall grass."],
  ["Majuli", "Assam", "Tradition", 1000, 100, "Brahmaputra Eco Huts", 97, "The world's largest river island, rich in vibrant Neo-Vaishnavite culture.", "https://images.unsplash.com/photo-1584559582128-b8be739912e1?auto=format&fit=crop&q=80&w=800", "A floating world of culture and spirituality on the Brahmaputra."],
  ["Shillong", "Meghalaya", "Enjoyment", 2500, 300, "Khasi Hills Green Retreat", 94, "The 'Scotland of the East' known for its waterfalls and rolling hills.", "https://images.unsplash.com/photo-1500353391678-d7b57979d6d2?auto=format&fit=crop&q=80&w=800", "The abode of clouds, where music and nature dance in harmony."],
  ["Darjeeling", "West Bengal", "Enjoyment", 2000, 300, "Himalayan Tea Eco Estate", 92, "World-famous for its tea and the panoramic view of Mt. Kanchenjunga.", "https://images.unsplash.com/photo-1540611025311-01df3cef54b5?auto=format&fit=crop&q=80&w=800", "The queen of the hills, where the toy train winds through tea gardens."],
  ["Sundarbans", "West Bengal", "Enjoyment", 2500, 350, "Tiger Mangrove Eco Camp", 95, "The largest mangrove forest in the world and home to the Royal Bengal Tiger.", "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&q=80&w=800", "The mysterious labyrinth of mangroves, where the tiger lurks in the shadows."],
  ["Amritsar", "Punjab", "Devotional", 1000, 150, "Khalsa Eco Sarai", 98, "The holiest shrine in Sikhism, radiating peace and spiritual tranquility.", "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&q=80&w=800", "The pool of nectar, where the golden dome reflects the light of the divine."],
  ["Kutch", "Gujarat", "Tradition", 2000, 300, "Rann Salt Eco Tents", 93, "Famous for the spectacular white salt desert and the vibrant Rann Utsav.", "https://images.unsplash.com/photo-1597042234225-50744eb12e45?auto=format&fit=crop&q=80&w=800", "The white desert that glows under the full moon, alive with color and craft."],
  ["Statue of Unity", "Gujarat", "History", 1500, 200, "Narmada Green Stays", 85, "The world's tallest statue, dedicated to the Iron Man of India, Sardar Patel.", "https://images.unsplash.com/photo-1605462863863-10d9e47e15ee?auto=format&fit=crop&q=80&w=800", "A towering tribute to unity, overlooking the Narmada river."],
  ["Somnath", "Gujarat", "Devotional", 1200, 150, "Saurashtra Eco Heritage", 94, "The first among the twelve Jyotirlinga shrines of Lord Shiva.", "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&q=80&w=800", "The eternal shrine that has risen from the ashes, time and again."],
  ["Lepakshi", "Andhra Pradesh", "History", 900, 100, "Veerabhadra Eco Lodge", 92, "Known for its hanging pillar and fascinating Vijayanagara architectural wonders.", "https://images.unsplash.com/photo-1621360841013-c7683c659ec6?auto=format&fit=crop&q=80&w=800", "The stone that speaks of the glory of the Vijayanagara kings."],
  ["Araku Valley", "Andhra Pradesh", "Enjoyment", 1500, 200, "Eastern Ghats Tribal Eco Resort", 95, "A picturesque hill station known for its coffee plantations and tribal culture.", "https://images.unsplash.com/photo-1500353391678-d7b57979d6d2?auto=format&fit=crop&q=80&w=800", "The coffee-scented valley of the Eastern Ghats, home to ancient tribes."],
  ["Coorg", "Karnataka", "Enjoyment", 2200, 300, "Kodagu Coffee Eco Estate", 93, "Lush green landscapes, waterfalls, and aromatic coffee estates.", "https://images.unsplash.com/photo-1590733455785-f18519f59218?auto=format&fit=crop&q=80&w=800", "The Scotland of India, where the hills are draped in coffee and mist."],
  ["Ooty", "Tamil Nadu", "Enjoyment", 2500, 300, "Nilgiri Biosphere Resort", 91, "A popular hill station blending colonial charm with scenic botanical gardens.", "https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&q=80&w=800", "The blue mountains, where the toy train climbs through eucalyptus forests."],
  ["Kodaikanal", "Tamil Nadu", "Enjoyment", 2500, 300, "Princess of Hills Eco Lodge", 92, "Known for its star-shaped lake and misty, pine-covered valleys.", "https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&q=80&w=800", "The gift of the forest, where the mist dances over the star-shaped lake."]
];

for (const dest of destinations) {
  insertDest.run(...dest);
}

// Seed some data if empty
const staysCount = db.prepare("SELECT count(*) as count FROM TRIBAL_STAYS").get() as { count: number };
if (staysCount.count === 0) {
  const insertStay = db.prepare("INSERT INTO TRIBAL_STAYS (tribe_name, location, eco_rating, capacity, cultural_activities, price_per_night, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertStay.run("Chenchu Tribe", "Nallamala Forest, Telangana", 4.9, 4, "Archery, Honey Gathering", 1200, "https://picsum.photos/seed/chenchu/800/600");
  insertStay.run("Toda Tribe", "Nilgiri Hills, Tamil Nadu", 4.8, 6, "Embroidery, Buffalo Herding", 1500, "https://picsum.photos/seed/toda/800/600");
  insertStay.run("Warli Tribe", "Sahyadri Range, Maharashtra", 4.7, 5, "Warli Painting, Farming", 1000, "https://picsum.photos/seed/warli/800/600");
}

const productsCount = db.prepare("SELECT count(*) as count FROM LOCAL_PRODUCTS").get() as { count: number };
if (productsCount.count === 0) {
  const insertProduct = db.prepare("INSERT INTO LOCAL_PRODUCTS (name, artisan_name, eco_category, price, region, image_url) VALUES (?, ?, ?, ?, ?, ?)");
  insertProduct.run("Handwoven Bamboo Basket", "Ramesh", "Eco-friendly", 450, "Telangana", "https://picsum.photos/seed/bamboo/400/400");
  insertProduct.run("Organic Tribal Honey", "Sita", "Organic", 350, "Nallamala", "https://picsum.photos/seed/honey/400/400");
  insertProduct.run("Traditional Warli Painting", "Maya", "Handicraft", 1200, "Maharashtra", "https://picsum.photos/seed/painting/400/400");
}

const guidesCount = db.prepare("SELECT count(*) as count FROM GUIDES").get() as { count: number };
if (guidesCount.count === 0) {
  const insertGuide = db.prepare("INSERT INTO GUIDES (name, vehicle_type, certification_status, language, rating, price_per_hour) VALUES (?, ?, ?, ?, ?, ?)");
  insertGuide.run("Arjun", "EV Bike", "Certified", "Telugu, English", 4.9, 200);
  insertGuide.run("Priya", "EV Car", "Certified", "Tamil, English", 4.8, 400);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/destinations", (req, res) => {
    const dests = db.prepare("SELECT * FROM DESTINATIONS").all();
    res.json(dests);
  });

  app.get("/api/stays", (req, res) => {
    const stays = db.prepare("SELECT * FROM TRIBAL_STAYS").all();
    res.json(stays);
  });

  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM LOCAL_PRODUCTS").all();
    res.json(products);
  });

  app.get("/api/guides", (req, res) => {
    const guides = db.prepare("SELECT * FROM GUIDES").all();
    res.json(guides);
  });

  app.post("/api/sos", (req, res) => {
    const { user_id, location } = req.body;
    const info = db.prepare("INSERT INTO EMERGENCY_ALERTS (user_id, location) VALUES (?, ?)").run(user_id, JSON.stringify(location));
    console.log(`🚨 SOS ALERT from ${user_id} at ${JSON.stringify(location)}`);
    res.json({ success: true, alert_id: info.lastInsertRowid });
  });

  app.post("/api/track", (req, res) => {
    const { user_id, latitude, longitude } = req.body;
    db.prepare("INSERT INTO LIVE_TRACKING (user_id, latitude, longitude) VALUES (?, ?, ?)").run(user_id, latitude, longitude);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ExploreX Server running on http://localhost:${PORT}`);
  });
}

startServer();
