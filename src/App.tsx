import React, { useState, useEffect, useRef } from 'react';
import { 
  Leaf, 
  Shield, 
  Users, 
  Zap, 
  ShoppingBag, 
  MapPin, 
  Map,
  Cpu, 
  Mic, 
  Globe, 
  AlertTriangle, 
  Home, 
  Calendar, 
  History,
  Menu,
  X,
  Star,
  Volume2,
  ArrowRight,
  Phone,
  Info,
  MoreVertical,
  Eye,
  Maximize,
  Navigation,
  MicOff,
  Activity,
  Search,
  Lock,
  Plus,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TribalStay, LocalProduct, Guide, Language, Destination } from './types';
import { getTravelAdvice, getVirtualGuideInfo, generateSpeech, transcribeAudio, getNearbyPlaces, connectLive } from './services/geminiService';
import { generateLogoConcept } from './services/logoService';
import { Logo } from './components/Logo';
import { Tooltip } from './components/Tooltip';
import { LoginPage } from './components/LoginPage';
import { t } from './translations';
import { auth, googleProvider } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  User
} from 'firebase/auth';

const LANGUAGES: Language[] = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Odia', 'Bengali', 'Punjabi', 'Gujarati', 'Marathi', 'Russian', 'French', 'Spanish', 'German', 'Vietnamese', 'Japanese', 'Korean'];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [language, setLanguage] = useState<Language>('English');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [stays, setStays] = useState<TribalStay[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [isTimeTravelOpen, setIsTimeTravelOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string, audio?: string}[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSosActive, setIsSosActive] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLensLoading, setIsLensLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGlobalMenuOpen, setIsGlobalMenuOpen] = useState(false);
  const [isVrTourOpen, setIsVrTourOpen] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<{label: string, info: string} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveVoiceActive, setIsLiveVoiceActive] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveSession, setLiveSession] = useState<any>(null);
  const [mapsGroundingResults, setMapsGroundingResults] = useState<{text: string, links: {title?: string, uri?: string}[]} | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [isTripSaved, setIsTripSaved] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDestId, setUploadingDestId] = useState<number | null>(null);
  const [userPreferences, setUserPreferences] = useState<string[]>(() => {
    const saved = localStorage.getItem('explorex_preferences');
    return saved ? JSON.parse(saved) : [];
  });
  const [showPreferenceModal, setShowPreferenceModal] = useState(() => !localStorage.getItem('explorex_preferences'));
  const [karmaPoints, setKarmaPoints] = useState(() => parseInt(localStorage.getItem('explorex_karma') || '0'));
  const [isPiezoWalking, setIsPiezoWalking] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoginPageOpen, setIsLoginPageOpen] = useState(true);
  const [hasSkippedLogin, setHasSkippedLogin] = useState(false);
  const [steps, setSteps] = useState(0);
  const [leftFootSteps, setLeftFootSteps] = useState(0);
  const [rightFootSteps, setRightFootSteps] = useState(0);
  const [lastFoot, setLastFoot] = useState<'left' | 'right' | null>(null);
  
  // Trip Planner & Filter State
  const [origin, setOrigin] = useState(() => localStorage.getItem('explorex_origin') || '');
  const [days, setDays] = useState(() => parseInt(localStorage.getItem('explorex_days') || '3'));
  const [members, setMembers] = useState(() => parseInt(localStorage.getItem('explorex_members') || '2'));
  const [destinationInput, setDestinationInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVibe, setFilterVibe] = useState('All');
  const [sortBy, setSortBy] = useState('none');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchData();
    setupTracking();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/auth.user
        console.log("User is signed in:", currentUser.uid);
        setIsLoginPageOpen(false);
      } else {
        // User is signed out
        console.log("User is signed out");
        if (!hasSkippedLogin) {
          setIsLoginPageOpen(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const featured = destinations.filter(d => d.isFeatured);
    if (featured.length > 0) {
      const timer = setInterval(() => {
        setFeaturedIndex(prev => (prev + 1) % featured.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [destinations]);

  const handleTranscription = async () => {
    if (isTranscribing) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const text = await transcribeAudio(base64Audio);
          if (text) {
            setInputMessage(text);
          }
          setIsTranscribing(false);
          setIsRecording(false);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
    } catch (err) {
      console.error("Microphone error:", err);
    }
  };

  const toggleLiveVoice = async () => {
    if (isLiveVoiceActive) {
      liveSession?.close();
      setLiveSession(null);
      setIsLiveVoiceActive(false);
      return;
    }

    try {
      const session = await connectLive({
        onopen: () => {
          console.log("Live session opened");
          setIsLiveVoiceActive(true);
        },
        onmessage: (msg) => {
          console.log("Live message:", msg);
          // Handle audio output if needed (Live API handles it automatically in some contexts, 
          // but here we just log for demo purposes)
        },
        onerror: (err) => {
          console.error("Live error:", err);
          setIsLiveVoiceActive(false);
        },
        onclose: () => {
          console.log("Live session closed");
          setIsLiveVoiceActive(false);
        }
      });
      setLiveSession(session);
    } catch (err) {
      console.error("Live connection error:", err);
    }
  };

  const handleMapsGrounding = async () => {
    const query = `Find nearby sustainable tourist spots and EV charging stations in ${origin || 'India'}`;
    const results = await getNearbyPlaces(query);
    setMapsGroundingResults(results);
  };

  const handleGenerateLogo = async () => {
    setIsGeneratingLogo(true);
    const url = await generateLogoConcept();
    if (url) setLogoUrl(url);
    setIsGeneratingLogo(false);
  };

  const handleSaveTrip = () => {
    localStorage.setItem('explorex_origin', origin);
    localStorage.setItem('explorex_days', days.toString());
    localStorage.setItem('explorex_members', members.toString());
    setIsTripSaved(true);
    setTimeout(() => setIsTripSaved(false), 3000);
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setIsAdminLoginOpen(false);
      setAdminPassword('');
    } else {
      alert('Invalid password');
    }
  };

  const updateDestinationPhotos = (destId: number, photoUrl: string) => {
    const updated = destinations.map(d => {
      if (d.dest_id === destId) {
        return { ...d, image_url: photoUrl };
      }
      return d;
    });
    setDestinations(updated);
    localStorage.setItem('explorex_destinations', JSON.stringify(updated));
  };

  const toggleFeatured = (destId: number) => {
    const updated = destinations.map(d => {
      if (d.dest_id === destId) {
        return { ...d, isFeatured: !d.isFeatured };
      }
      return d;
    });
    setDestinations(updated);
    localStorage.setItem('explorex_destinations', JSON.stringify(updated));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingDestId !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateDestinationPhotos(uploadingDestId, base64String);
        setUploadingDestId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = (destId: number) => {
    setUploadingDestId(destId);
    fileInputRef.current?.click();
  };

  const fetchData = async () => {
    try {
      const [staysRes, productsRes, guidesRes, destsRes] = await Promise.all([
        fetch('/api/stays'),
        fetch('/api/products'),
        fetch('/api/guides'),
        fetch('/api/destinations')
      ]);
      
      const remoteDests = await destsRes.json();
      const localDests = localStorage.getItem('explorex_destinations');
      
      const categorize = (d: any) => {
        const cats: string[] = [];
        const text = (d.place + d.vibe + d.insight).toLowerCase();
        if (text.includes('temple') || text.includes('spiritual') || text.includes('holy') || text.includes('monastery') || text.includes('devotional')) cats.push('Devotional');
        if (text.includes('beach') || text.includes('party') || text.includes('fun') || text.includes('nightlife') || text.includes('enjoyment')) cats.push('Enjoyment');
        if (text.includes('tribe') || text.includes('tribal') || text.includes('village') || text.includes('indigenous')) cats.push('Tribal');
        if (text.includes('culture') || text.includes('tradition') || text.includes('art') || text.includes('heritage')) cats.push('Culture');
        if (text.includes('history') || text.includes('ancient') || text.includes('fort') || text.includes('palace') || text.includes('museum')) cats.push('History');
        
        if (cats.length === 0) cats.push('Culture');
        return cats;
      };

      if (localDests) {
        const parsed = JSON.parse(localDests);
        setDestinations(parsed.map((d: any) => ({ ...d, categories: d.categories || categorize(d) })));
      } else {
        const initialDests = remoteDests.map((d: any, idx: number) => ({
          ...d,
          isFeatured: idx < 5,
          categories: categorize(d)
        }));
        setDestinations(initialDests);
        localStorage.setItem('explorex_destinations', JSON.stringify(initialDests));
      }
      
      setStays(await staysRes.json());
      setProducts(await productsRes.json());
      setGuides(await guidesRes.json());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const setupTracking = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition((pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
        // Silently track for safety if consent given (implied in this demo)
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'guest_user', ...newLoc })
        });
      });
    }
  };

  const handlePreferenceSelection = (pref: string) => {
    setUserPreferences(prev => 
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const savePreferences = () => {
    localStorage.setItem('explorex_preferences', JSON.stringify(userPreferences));
    setShowPreferenceModal(false);
  };

  const handlePiezoWalk = () => {
    setIsPiezoWalking(!isPiezoWalking);
  };

  const handleStep = (foot: 'left' | 'right') => {
    if (!isPiezoWalking) return;
    
    setSteps(prev => prev + 1);
    if (foot === 'left') setLeftFootSteps(prev => prev + 1);
    else setRightFootSteps(prev => prev + 1);
    setLastFoot(foot);
    
    // Every 10 steps = 1 Karma point
    if ((steps + 1) % 10 === 0) {
      const newPoints = karmaPoints + 1;
      setKarmaPoints(newPoints);
      localStorage.setItem('explorex_karma', newPoints.toString());
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSos = async () => {
    setIsSosActive(true);
    try {
      await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'guest_user', location })
      });
      alert("🚨 SOS ALERT SENT! Local authorities and emergency contacts have been notified with your live location.");
    } catch (err) {
      console.error("SOS error:", err);
    }
    setTimeout(() => setIsSosActive(false), 5000);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputMessage('');
    setIsAiLoading(true);

    const aiResponse = await getTravelAdvice(userMsg, language);
    
    // Voice Analysis (TTS)
    const audioData = await generateSpeech(aiResponse || "I'm sorry, I couldn't process that.");
    
    setChatMessages(prev => [...prev, { 
      role: 'ai', 
      text: aiResponse || 'Sorry, I am busy right now.',
      audio: audioData || undefined
    }]);
    setIsAiLoading(false);

    if (audioData) {
      playAudio(audioData);
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
      setIsSpeaking(true);
      audioRef.current.onended = () => setIsSpeaking(false);
    }
  };

  const handleLensToggle = () => {
    if (!isTimeTravelOpen) {
      setIsLensLoading(true);
      setTimeout(() => {
        setIsLensLoading(false);
        setIsTimeTravelOpen(true);
      }, 1500);
    } else {
      setIsTimeTravelOpen(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'English' ? 'en-US' : 
                      language === 'Hindi' ? 'hi-IN' : 
                      language === 'Telugu' ? 'te-IN' : 
                      language === 'Tamil' ? 'ta-IN' : 'en-US';
    
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
    };

    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const VR_TOUR_DATA: Record<string, { panorama: string, hotspots: { x: number, y: number, label: string, info: string }[] }> = {
    "Taj Mahal": {
      panorama: "https://images.unsplash.com/photo-1564507592333-c60657ece523?auto=format&fit=crop&q=80&w=2000",
      hotspots: [
        { x: 50, y: 40, label: "Main Dome", info: "The iconic central dome of the Taj Mahal, reaching a height of 73 meters." },
        { x: 30, y: 60, label: "Minaret", info: "One of the four minarets designed with a slight outward tilt for earthquake safety." }
      ]
    },
    "Hampi": {
      panorama: "https://images.unsplash.com/photo-1581330152515-b4ff0a20564a?auto=format&fit=crop&q=80&w=2000",
      hotspots: [
        { x: 45, y: 50, label: "Virupaksha Temple", info: "The oldest functioning temple in Hampi, dedicated to Lord Shiva." },
        { x: 70, y: 55, label: "Stone Chariot", info: "A magnificent sculpture of a chariot, one of the three famous stone chariots in India." }
      ]
    },
    "Varanasi": {
      panorama: "https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&q=80&w=2000",
      hotspots: [
        { x: 50, y: 70, label: "Dashashwamedh Ghat", info: "The main ghat in Varanasi on the Ganga River, famous for its evening Aarti." },
        { x: 20, y: 40, label: "Kashi Vishwanath Temple", info: "One of the most famous Hindu temples dedicated to Lord Shiva." }
      ]
    }
  };

  const renderVrTour = () => {
    if (!selectedDest || !VR_TOUR_DATA[selectedDest.place]) return null;
    const tour = VR_TOUR_DATA[selectedDest.place];

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black flex flex-col"
      >
        <div className="absolute top-8 left-8 z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
            <Eye size={24} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-xl">{selectedDest.place}</h3>
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">{t('immersive_tour', language)}</p>
          </div>
        </div>

        <button 
          onClick={() => setIsVrTourOpen(false)}
          className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all z-10"
        >
          <X size={24} />
        </button>

        <div className="relative flex-1 overflow-hidden cursor-move group">
          <motion.img 
            src={tour.panorama}
            className="absolute inset-0 w-[200%] h-full object-cover max-w-none"
            animate={{ x: ["-25%", "-50%", "-25%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          />
          
          <div className="absolute inset-0 bg-black/20" />

          {tour.hotspots.map((spot, i) => (
            <motion.div
              key={i}
              className="absolute z-20"
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.2 }}
            >
              <button 
                onClick={() => setActiveHotspot(spot)}
                className="w-10 h-10 bg-emerald-500/80 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-110 transition-transform group"
              >
                <Info size={20} />
                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {spot.label}
                </span>
              </button>
            </motion.div>
          ))}

          <AnimatePresence>
            {activeHotspot && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[2.5rem] shadow-2xl z-30"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-emerald-400 font-black uppercase tracking-widest text-sm">{activeHotspot.label}</h4>
                  <button onClick={() => setActiveHotspot(null)} className="text-white/50 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-white text-lg leading-relaxed font-medium italic">
                  "{activeHotspot.info}"
                </p>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-emerald-400/50 uppercase tracking-widest">
                  <Zap size={12} /> {t('insight', language)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-24 bg-black border-t border-white/10 flex items-center justify-center px-8">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
            {t('vr_active', language)} • {t('move_to_explore', language)}
          </p>
        </div>
      </motion.div>
    );
  };

  const calculatePrice = (dest: Destination, days: number, members: number, origin: string) => {
    const dailyCostPerPerson = dest.day_cost;
    const accommodationCost = dailyCostPerPerson * days * members;
    
    // Simulated travel cost based on origin (just a demo logic)
    // If origin is provided, we add a base travel cost
    const travelCostPerPerson = origin ? 1500 + (Math.random() * 2000) : 0;
    const totalTravelCost = travelCostPerPerson * members;
    
    const evFee = dest.ev_fee * members;
    const subtotal = accommodationCost + totalTravelCost + evFee;
    const gst = subtotal * 0.18;
    const totalBeforeDiscount = subtotal + gst;
    const discount = totalBeforeDiscount * 0.15; // 15% Green Karma Discount
    
    return {
      accommodationCost,
      travelCost: totalTravelCost,
      subtotal,
      gst,
      total: totalBeforeDiscount - discount,
      savings: discount
    };
  };

  const renderFeaturedSlider = () => {
    const featured = destinations.filter(d => d.isFeatured).slice(0, 5);
    if (featured.length === 0) return null;
    const current = featured[featuredIndex % featured.length];

    return (
      <section className="mb-20 px-6 max-w-7xl mx-auto">
        <div className="relative h-[600px] rounded-[3.5rem] overflow-hidden group shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.dest_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <img 
                src={current.image_url} 
                className="w-full h-full object-cover brightness-75 transition-transform duration-[10s] ease-linear scale-110 group-hover:scale-100" 
                alt={current.place}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-16 left-16 right-16">
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full mb-6 inline-block">Featured Destination</span>
                  <h2 className="text-7xl font-black text-white mb-6 tracking-tighter uppercase leading-none">{current.place}</h2>
                  <p className="text-white/80 text-xl font-medium max-w-2xl mb-10 italic">"{current.insight}"</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setSelectedDest(current)}
                      className="px-10 py-5 bg-white text-gray-900 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-3"
                    >
                      Explore Now <ArrowRight size={20} />
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="absolute bottom-8 right-16 flex gap-2">
            {featured.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setFeaturedIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === (featuredIndex % featured.length) ? 'bg-emerald-500 w-8' : 'bg-white/30'}`} 
              />
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderAdminPanel = () => {
    if (!isAdmin) return null;
    return (
      <section className="px-6 max-w-7xl mx-auto mb-12">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Lock size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-amber-900 uppercase tracking-tight">Admin Management Panel</h2>
              <p className="text-amber-700/60 text-sm font-bold uppercase tracking-widest">Quick Controls & Overrides</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ImageIcon size={16} /> Quick Photo Upload
              </h3>
              <div className="flex gap-3">
                <select 
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none"
                  onChange={(e) => setUploadingDestId(parseInt(e.target.value))}
                  value={uploadingDestId || ''}
                >
                  <option value="">Select Destination...</option>
                  {destinations.map(d => <option key={d.dest_id} value={d.dest_id}>{d.place}</option>)}
                </select>
                <button 
                  onClick={() => uploadingDestId && fileInputRef.current?.click()}
                  disabled={!uploadingDestId}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Star size={16} /> Featured Management
              </h3>
              <div className="flex flex-wrap gap-2">
                {destinations.filter(d => d.isFeatured).map(d => (
                  <div key={d.dest_id} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    {d.place}
                    <button onClick={() => toggleFeatured(d.dest_id)} className="hover:text-red-500"><X size={12} /></button>
                  </div>
                ))}
                {destinations.filter(d => d.isFeatured).length === 0 && <p className="text-gray-400 text-xs italic">No destinations featured yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderPreferenceModal = () => {
    const options = ['Devotional', 'Enjoyment', 'Tribal', 'Culture', 'History'];
    return (
      <AnimatePresence>
        {showPreferenceModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3.5rem] p-12 max-w-2xl w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-emerald-500/20">
                <Zap size={40} />
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase">Personalize Your Journey</h2>
              <p className="text-gray-500 text-lg mb-10 font-medium">Select your travel preferences to help us curate the perfect eco-conscious experience for you.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
                {options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handlePreferenceSelection(opt)}
                    className={`px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border-2 transition-all ${userPreferences.includes(opt) ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-emerald-200'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {userPreferences.includes(opt) && <Check size={16} />}
                      {opt}
                    </div>
                  </button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={savePreferences}
                disabled={userPreferences.length === 0}
                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-black/10 disabled:opacity-50 mb-4"
              >
                Start Exploring
              </motion.button>

              {!user && (
                <button 
                  onClick={() => {
                    setIsLoginPageOpen(true);
                    setShowPreferenceModal(false);
                  }}
                  className="w-full py-4 bg-emerald-500/10 text-emerald-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500/20 transition-all"
                >
                  Login to Sync Progress
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderPiezoSection = () => {
    return (
      <section id="piezo" className="px-6 py-24 bg-gray-950 rounded-[4rem] mx-4 relative overflow-hidden mb-32">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest mb-8">
                <Activity size={16} /> Future Tech: Piezoelectric Energy
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter uppercase leading-none">Walk to <span className="text-emerald-400">Power</span> the Future.</h2>
              <p className="text-gray-400 text-xl font-medium leading-relaxed mb-12">
                Inspired by Japan's latest energy innovations, our smart tiles convert your footsteps into clean electricity. Every step you take on our designated "Piezo Paths" contributes to the local grid.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <div className="flex flex-col">
                  <span className="text-4xl font-black text-white mb-1">{karmaPoints}</span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Your Karma Points</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-4xl font-black text-white mb-1">{steps}</span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Total Steps</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-white mb-1">{leftFootSteps}</span>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Left Foot</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-white mb-1">{rightFootSteps}</span>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Right Foot</span>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-12">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live Energy Output</span>
                  <span className="text-emerald-400 font-mono text-xs">{(steps * 0.05).toFixed(2)}W</span>
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: isPiezoWalking ? [
                          Math.random() * 100 + '%', 
                          Math.random() * 100 + '%', 
                          Math.random() * 100 + '%'
                        ] : '10%' 
                      }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="flex-1 bg-emerald-500/40 rounded-t-sm"
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePiezoWalk}
                  className={`px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center gap-4 transition-all ${isPiezoWalking ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}
                >
                  {isPiezoWalking ? (
                    <>Stop Walking <X size={20} /></>
                  ) : (
                    <>
                      Start Piezo Walk <Activity size={20} className="animate-pulse" />
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-white/5 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center p-12 relative overflow-hidden">
                <AnimatePresence>
                  {isPiezoWalking && (
                    <div className="absolute inset-0 flex items-center justify-center gap-20">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleStep('left')}
                        className={`w-32 h-48 rounded-[2rem] border-4 flex flex-col items-center justify-center gap-4 transition-all ${lastFoot === 'left' ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10'}`}
                      >
                        <div className="text-blue-400 font-black text-xs uppercase tracking-widest">Left</div>
                        <div className="w-12 h-20 bg-blue-500/40 rounded-full blur-xl" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleStep('right')}
                        className={`w-32 h-48 rounded-[2rem] border-4 flex flex-col items-center justify-center gap-4 transition-all ${lastFoot === 'right' ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'bg-white/5 border-white/10'}`}
                      >
                        <div className="text-amber-400 font-black text-xs uppercase tracking-widest">Right</div>
                        <div className="w-12 h-20 bg-amber-500/40 rounded-full blur-xl" />
                      </motion.button>
                    </div>
                  )}
                </AnimatePresence>

                {!isPiezoWalking && (
                  <div className="relative z-10 text-center">
                    <div className="w-32 h-32 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-emerald-500/40">
                      <Zap size={64} />
                    </div>
                    <p className="text-white text-2xl font-black uppercase tracking-tighter">Smart Tile Grid v2.0</p>
                    <p className="text-gray-500 font-bold mt-2">Interactive Step Tracker Enabled</p>
                  </div>
                )}
                
                {/* Floating Energy Animation */}
                <AnimatePresence>
                  {isPiezoWalking && lastFoot && (
                    <motion.div
                      key={steps}
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -150, scale: 1.5 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-1/4 text-emerald-400 font-black text-2xl pointer-events-none"
                    >
                      <Zap size={24} className="inline mr-2" /> +0.05W
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderHome = () => {
    const filteredDestinations = destinations
      .filter(dest => {
        const matchesDestination = dest.place.toLowerCase().includes(destinationInput.toLowerCase()) || 
                                  dest.state.toLowerCase().includes(destinationInput.toLowerCase());
        const matchesSearch = dest.place.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             dest.state.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesVibe = filterVibe === 'All' || dest.vibe === filterVibe;
        const matchesGlobal = !globalSearchQuery || 
                             dest.place.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
                             dest.state.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                             dest.vibe.toLowerCase().includes(globalSearchQuery.toLowerCase());
        
        // Preference Filtering
        const matchesPreferences = userPreferences.length === 0 || 
                                  dest.categories.some(cat => userPreferences.includes(cat));

        return matchesDestination && matchesSearch && matchesVibe && matchesGlobal && matchesPreferences;
      })
      .sort((a, b) => {
        if (sortBy === 'price_low_high') return a.day_cost - b.day_cost;
        if (sortBy === 'price_high_low') return b.day_cost - a.day_cost;
        if (sortBy === 'green_score_high') return b.green_score - a.green_score;
        if (sortBy === 'nearby' && origin) {
          const aIsNearby = a.state.toLowerCase().includes(origin.toLowerCase()) || origin.toLowerCase().includes(a.state.toLowerCase());
          const bIsNearby = b.state.toLowerCase().includes(origin.toLowerCase()) || origin.toLowerCase().includes(b.state.toLowerCase());
          if (aIsNearby && !bIsNearby) return -1;
          if (!aIsNearby && bIsNearby) return 1;
        }
        return 0;
      });

    return (
      <div className="space-y-24 pb-20">
        {renderFeaturedSlider()}
        {renderAdminPanel()}
        {renderPiezoSection()}
        {/* Hero Section */}
        <section className="relative h-[90vh] flex items-center justify-center overflow-hidden rounded-[3rem] mx-4 mt-4">
          <img 
            src="https://images.unsplash.com/photo-1524492459413-0296b71d4744?auto=format&fit=crop&q=80&w=2000" 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Taj Mahal Sunrise"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/60" />
          
          <div className="relative z-10 text-center px-12 max-w-7xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-bold mb-8 backdrop-blur-md">
                <Leaf size={16} /> ExploreX v2.0 • {t('verified', language)}
              </span>
              <h1 className="text-6xl md:text-9xl font-black text-white mb-8 tracking-tighter leading-none uppercase">
                {t('explore', language)} <br/> <span className="text-emerald-400 italic">{t('purpose', language)}.</span>
              </h1>
              <p className="text-xl text-gray-200 mb-12 leading-relaxed max-w-3xl mx-auto">
                {t('hero_desc', language)}
              </p>
              <div className="flex justify-center gap-4">
                <div className="flex flex-wrap gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: '#059669' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const planner = document.getElementById('trip-planner');
                      planner?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-10 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-lg transition-all flex items-center gap-3 shadow-2xl shadow-emerald-500/40 uppercase tracking-widest"
                  >
                    {t('start_planning', language)} <ArrowRight size={24} />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMapsGrounding}
                    className="px-10 py-5 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-[2rem] font-black text-lg transition-all flex items-center gap-3 shadow-2xl uppercase tracking-widest"
                  >
                    <Navigation size={24} /> {t('nearby_places', language)}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trip Planner Section */}
        <section id="trip-planner" className="px-6 max-w-7xl mx-auto">
          <div className="bg-white/40 backdrop-blur-3xl border border-white/40 rounded-[3.5rem] p-10 shadow-2xl shadow-black/5">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Map size={24} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{t('trip_planner', language)}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <div className="space-y-4 p-6 bg-gray-50/50 rounded-[2.5rem] border border-gray-100/50 transition-all hover:bg-white hover:shadow-xl group">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{t('origin', language)}</label>
                  <Tooltip content={t('tooltip_origin', language)}>
                    <Info size={14} className="text-gray-300 hover:text-emerald-500 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                  <motion.input 
                    type="text" 
                    whileFocus={{ scale: 1.02 }}
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder={t('enter_origin', language)}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none transition-all shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="space-y-4 p-6 bg-gray-50/50 rounded-[2.5rem] border border-gray-100/50 transition-all hover:bg-white hover:shadow-xl group">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{t('destination', language)}</label>
                  <Tooltip content={t('tooltip_destination', language)}>
                    <Info size={14} className="text-gray-300 hover:text-emerald-500 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                  <motion.input 
                    type="text" 
                    whileFocus={{ scale: 1.02 }}
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    placeholder={t('enter_destination', language)}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none transition-all shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>
              
              <div className="space-y-4 p-6 bg-gray-50/50 rounded-[2.5rem] border border-gray-100/50 transition-all hover:bg-white hover:shadow-xl group">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{t('days', language)}</label>
                  <Tooltip content={t('tooltip_days', language)}>
                    <Info size={14} className="text-gray-300 hover:text-emerald-500 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                  <motion.input 
                    type="number" 
                    whileFocus={{ scale: 1.02 }}
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none transition-all shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="space-y-4 p-6 bg-gray-50/50 rounded-[2.5rem] border border-gray-100/50 transition-all hover:bg-white hover:shadow-xl group">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{t('members', language)}</label>
                  <Tooltip content={t('tooltip_members', language)}>
                    <Info size={14} className="text-gray-300 hover:text-emerald-500 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                  <motion.input 
                    type="number" 
                    whileFocus={{ scale: 1.02 }}
                    value={members}
                    onChange={(e) => setMembers(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none transition-all shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="space-y-4 p-6 bg-gray-50/50 rounded-[2.5rem] border border-gray-100/50 transition-all hover:bg-white hover:shadow-xl group">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Add Photos</label>
                  <Tooltip content="Upload photos of your previous trips to share with the community.">
                    <Info size={14} className="text-gray-300 hover:text-emerald-500 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <label className="flex items-center justify-center gap-3 w-full py-5 bg-white border border-gray-100 rounded-2xl text-sm font-bold cursor-pointer hover:bg-emerald-50 transition-all text-gray-400 hover:text-emerald-600 shadow-sm border-dashed border-2">
                  <ShoppingBag size={20} />
                  <span>Upload</span>
                  <input type="file" className="hidden" multiple accept="image/*" />
                </label>
              </div>

              <div className="space-y-4 p-6 bg-gray-50/50 rounded-[2.5rem] border border-gray-100/50 transition-all hover:bg-white hover:shadow-xl group">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{t('search_destinations', language)}</label>
                  <Tooltip content={t('tooltip_search', language)}>
                    <Info size={14} className="text-gray-300 hover:text-emerald-500 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                  <motion.input 
                    type="text" 
                    whileFocus={{ scale: 1.02 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('search_destinations', language)}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none transition-all shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 pt-10 border-t border-gray-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <select 
                  value={filterVibe}
                  onChange={(e) => setFilterVibe(e.target.value)}
                  className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="All">{t('all_vibes', language)}</option>
                  <option value="History">{t('history', language)}</option>
                  <option value="Enjoyment">{t('enjoyment', language)}</option>
                  <option value="Devotional">{t('devotional', language)}</option>
                  <option value="Tradition">{t('tradition', language)}</option>
                </select>

                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="none">{t('sort_by', language)}</option>
                  <option value="nearby">{t('nearby', language)}</option>
                  <option value="price_low_high">{t('price_low_high', language)}</option>
                  <option value="price_high_low">{t('price_high_low', language)}</option>
                  <option value="green_score_high">{t('green_score_high', language)}</option>
                </select>

                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: isTripSaved ? '#059669' : '#10b981' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveTrip}
                  className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${isTripSaved ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'}`}
                >
                  {isTripSaved ? <Shield size={16} /> : <ShoppingBag size={16} />}
                  {isTripSaved ? t('trip_saved', language) : t('save_trip', language)}
                </motion.button>
              </div>

              <div className="w-full bg-emerald-50/50 border border-emerald-100/50 p-6 rounded-3xl mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">AI Trip Summary</h4>
                  <div className="flex gap-2">
                    {userPreferences.map(p => (
                      <span key={p} className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Group</p>
                      <p className="text-xs font-bold text-gray-900">{members} Persons</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Duration</p>
                      <p className="text-xs font-bold text-gray-900">{days} Days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Est. Budget</p>
                      <p className="text-xs font-bold text-gray-900">₹{(days * members * 4500).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-emerald-100/50 flex items-center justify-between">
                  <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-2">
                    <Leaf size={14} /> Eco-Optimized for {userPreferences.join(', ')}
                  </p>
                  <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">
                    Potential Karma: +{days * 50}
                  </p>
                </div>
              </div>

              <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                {filteredDestinations.length} {t('destinations_found', language)}
              </div>
            </div>
          </div>
        </section>

        {/* Personalized Recommendations Section */}
        {origin && (
          <section className="px-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{t('recommended_for_you', language)}</h2>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">{t('based_on_location', language)}: {origin}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {destinations
                .filter(d => d.state.toLowerCase().includes(origin.toLowerCase()) || origin.toLowerCase().includes(d.state.toLowerCase()))
                .slice(0, 4)
                .map((dest) => (
                  <motion.div 
                    key={`rec-${dest.dest_id}`}
                    whileHover={{ y: -5, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDest(dest)}
                    className="group cursor-pointer bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm transition-all"
                  >
                    <div className="relative h-40">
                      <img src={dest.image_url} className="w-full h-full object-cover" alt={dest.place} referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <h4 className="text-white font-black uppercase tracking-tighter">{dest.place}</h4>
                        <p className="text-white/70 text-[10px] font-bold uppercase">{dest.state}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              {destinations.filter(d => d.state.toLowerCase().includes(origin.toLowerCase()) || origin.toLowerCase().includes(d.state.toLowerCase())).length === 0 && (
                <div className="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No specific recommendations for this location yet. Try exploring our top picks below!</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Core Pillars */}
        <section className="px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Leaf className="text-emerald-500" />, title: t('sustainable_travel', language), desc: t('sustainable_desc', language) },
            { icon: <Users className="text-amber-500" />, title: t('cultural_immersion', language), desc: t('cultural_desc', language) },
            { icon: <Shield className="text-blue-500" />, title: t('tourist_safety', language), desc: t('safety_desc', language) }
          ].map((pillar, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
              whileTap={{ scale: 0.98 }}
              className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">
                {pillar.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{pillar.title}</h3>
              <p className="text-gray-600 leading-relaxed">{pillar.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Glassmorphic Destination Cards */}
        <section className="px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <h2 className="text-5xl font-black text-gray-900 mb-4 tracking-tighter uppercase">{t('top_destinations', language)}</h2>
              <p className="text-gray-500 text-lg font-medium">{t('curated_by', language)}.</p>
            </div>
            <div className="flex gap-4">
              <div className="px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center gap-3">
                <Zap className="text-emerald-500" size={20} />
                <span className="font-bold text-gray-900 uppercase tracking-widest text-xs">{t('green_score', language)}: 90+</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredDestinations.map((dest) => (
              <motion.div 
                key={dest.dest_id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ 
                  y: -10,
                  rotateX: 5,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.98 }}
                className={`group relative bg-white/40 backdrop-blur-xl border rounded-[3rem] overflow-hidden shadow-2xl shadow-black/5 perspective-1000 preserve-3d transition-all duration-500 ${dest.green_score >= 90 ? 'border-emerald-500/50 ring-4 ring-emerald-500/10' : 'border-white/40'}`}
              >
                <div className="relative h-72 overflow-hidden">
                  <img 
                    src={dest.image_url} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt={dest.place}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl text-white text-xs font-black uppercase tracking-widest border border-white/20">
                    {dest.vibe}
                  </div>
                  <div className="absolute top-6 right-6 w-14 h-14 bg-emerald-500 rounded-2xl flex flex-col items-center justify-center text-white border border-white/20 shadow-lg">
                    <span className="text-xs font-bold leading-none">Score</span>
                    <span className="text-xl font-black">{dest.green_score}</span>
                  </div>
                  
                  {isAdmin && (
                    <div className="absolute bottom-6 left-6 right-6 flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerFileUpload(dest.dest_id);
                        }}
                        className="flex-1 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/40 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Upload Photo
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFeatured(dest.dest_id);
                        }}
                        className={`w-10 h-10 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center transition-all ${dest.isFeatured ? 'bg-amber-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                      >
                        <Star size={16} fill={dest.isFeatured ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-8">
                  <div className="flex gap-2 mb-4">
                    {(dest.categories || []).map(cat => (
                      <span key={cat} className="px-2 py-1 bg-gray-100 text-gray-500 text-[8px] font-black uppercase tracking-widest rounded-md">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">{dest.place}</h3>
                  <p className="text-gray-500 flex items-center gap-1 mb-6 font-medium"><MapPin size={16} /> {dest.state}, India</p>
                  
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl mb-8">
                    <p className="text-emerald-700 text-sm italic font-medium">
                      " {dest.insight} "
                    </p>
                    <p className="text-[10px] text-emerald-600/50 uppercase font-black mt-2 tracking-widest">— {t('insight', language)}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-black tracking-widest mb-1">{t('starting_from', language)}</p>
                      <p className="text-2xl font-black text-gray-900">₹{dest.day_cost}<span className="text-sm text-gray-400 font-bold">/{t('day', language)}</span></p>
                    </div>
                    <button 
                      onClick={() => setSelectedDest(dest)}
                      className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-xl shadow-black/10"
                    >
                      <ArrowRight size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      {/* Time Travel Lens Feature */}
      <AnimatePresence>
        {selectedDest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] max-w-4xl w-full overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedDest(null)}
                className="absolute top-8 right-8 w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all z-10"
              >
                <X size={24} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative h-full min-h-[400px] overflow-hidden">
                  <img 
                    src={selectedDest.image_url} 
                    className={`w-full h-full object-cover transition-all duration-1000 ${isTimeTravelOpen ? 'sepia brightness-75 contrast-125' : ''} ${isLensLoading ? 'blur-sm grayscale' : ''}`}
                    alt={selectedDest.place}
                    referrerPolicy="no-referrer"
                  />
                  
                  {isLensLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-900/40 backdrop-blur-sm z-20">
                      <div className="relative w-24 h-24">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"
                        />
                        <History size={48} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
                      </div>
                      <p className="mt-6 text-emerald-100 font-black uppercase tracking-[0.3em] text-xs animate-pulse">{t('reconstructing', language)}</p>
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="w-full h-1 bg-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.5)] animate-scanline" />
                      </div>
                    </div>
                  )}

                  {isTimeTravelOpen && !isLensLoading && (
                    <div className="absolute inset-0 bg-amber-900/20 mix-blend-overlay animate-pulse" />
                  )}
                  
                  <div className="absolute bottom-8 left-8 right-8 z-30 flex flex-col gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLensToggle}
                      disabled={isLensLoading}
                      className="w-full py-4 bg-white/20 backdrop-blur-xl border border-white/30 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <History size={24} className={isTimeTravelOpen || isLensLoading ? 'animate-spin' : ''} />
                      {isLensLoading ? t('analyzing', language) : isTimeTravelOpen ? t('return_to_present', language) : t('explorex_lens', language)}
                    </motion.button>
                    
                    {VR_TOUR_DATA[selectedDest.place] && (
                      <motion.button 
                        whileHover={{ scale: 1.02, backgroundColor: '#10b981' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsVrTourOpen(true)}
                        className="w-full py-4 bg-emerald-500/80 backdrop-blur-xl border border-emerald-400/30 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                      >
                        <Eye size={24} />
                        {t('immersive_tour', language)}
                      </motion.button>
                    )}
                  </div>
                </div>

                <div className="p-12 flex flex-col justify-between">
                  <div>
                    <h2 className="text-5xl font-black text-gray-900 mb-2 tracking-tighter">{selectedDest.place}</h2>
                    <p className="text-gray-400 font-bold mb-8 uppercase tracking-widest text-sm">{selectedDest.vibe} Circuit • {selectedDest.state}</p>
                    
                    <div className="space-y-6">
                      <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <h4 className="font-black text-gray-900 mb-2 uppercase tracking-widest text-xs">{t('insight', language)}</h4>
                        <p className="text-gray-600 leading-relaxed italic">
                          {isTimeTravelOpen ? selectedDest.history_prime : selectedDest.insight}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{t('green_score', language)}</p>
                          <p className="text-2xl font-black text-emerald-900">{selectedDest.green_score}/100</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{t('ev_mobility', language)}</p>
                          <p className="text-2xl font-black text-blue-900">{t('secured', language)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-bold uppercase tracking-widest">{t('accommodation', language)} ({days} {t('days', language)} × {members} {t('members', language)})</span>
                        <span className="text-gray-900 font-black">₹{calculatePrice(selectedDest, days, members, origin).accommodationCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-bold uppercase tracking-widest">{t('travel_cost', language)}</span>
                        <span className="text-gray-900 font-black">₹{calculatePrice(selectedDest, days, members, origin).travelCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-4 border-t border-gray-50">
                        <span className="text-gray-400 font-bold uppercase tracking-widest">{t('total_estimation', language)}</span>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <p className="text-3xl font-black text-gray-900">₹{calculatePrice(selectedDest, days, members, origin).total.toLocaleString()}</p>
                            <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg uppercase">{t('green_karma_applied', language)}</span>
                          </div>
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">{t('you_save', language)} ₹{calculatePrice(selectedDest, days, members, origin).savings.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02, backgroundColor: '#047857' }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg transition-all shadow-2xl shadow-emerald-500/20 uppercase tracking-widest"
                    >
                      {t('confirm_booking', language)}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    );
  };

  const renderStays = () => (
    <div className="px-6 py-12 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-4xl font-bold text-gray-900 uppercase tracking-tighter">{t('stays', language)}</h2>
        <div className="flex gap-2">
          <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-100 uppercase tracking-widest">{t('eco_certified', language)}</span>
          <span className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-bold border border-amber-100 uppercase tracking-widest">{t('tribal_owned', language)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stays
          .filter(stay => 
            !globalSearchQuery || 
            stay.tribe_name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
            stay.location.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            stay.cultural_activities.toLowerCase().includes(globalSearchQuery.toLowerCase())
          )
          .map((stay) => (
          <motion.div 
            layoutId={`stay-${stay.stay_id}`}
            key={stay.stay_id} 
            whileHover={{ y: -10, shadow: "0 25px 50px -12px rgb(0 0 0 / 0.15)" }}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm transition-all"
          >
            <div className="relative h-64">
              <img src={stay.image_url} className="w-full h-full object-cover" alt={stay.tribe_name} referrerPolicy="no-referrer" />
              <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-sm font-bold flex items-center gap-1">
                <Star size={14} className="text-amber-500 fill-amber-500" /> {stay.eco_rating}
              </div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{stay.tribe_name}</h3>
                  <p className="text-gray-500 flex items-center gap-1"><MapPin size={16} /> {stay.location}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-emerald-600">₹{stay.price_per_night}</span>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">per night</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                  <Map size={16} className="text-emerald-500" />
                  <span>Activities: {stay.cultural_activities}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                  <Users size={16} className="text-emerald-500" />
                  <span>Capacity: Up to {stay.capacity} guests</span>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: '#10b981' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest transition-colors"
              >
                {t('book_experience', language)}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderMarketplace = () => (
    <div className="px-6 py-12 max-w-7xl mx-auto space-y-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-4xl font-black text-gray-900 mb-4 uppercase tracking-tighter">{t('artisanal_marketplace', language)}</h2>
        <p className="text-gray-500 font-medium">{t('support_artisans', language)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products
          .filter(product => 
            !globalSearchQuery || 
            product.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
            product.artisan_name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            product.eco_category.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            product.region.toLowerCase().includes(globalSearchQuery.toLowerCase())
          )
          .map((product) => (
          <motion.div 
            key={product.product_id} 
            whileHover={{ y: -8, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm transition-all group"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-100">
              <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={product.name} referrerPolicy="no-referrer" />
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                {product.eco_category}
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
            <p className="text-xs text-gray-500 mb-3 italic">By {product.artisan_name} • {product.region}</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">₹{product.price}</span>
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: '#10b981', color: '#ffffff' }}
                whileTap={{ scale: 0.9 }}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl transition-colors"
              >
                <ShoppingBag size={20} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderGuides = () => (
    <div className="px-6 py-12 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-2 uppercase tracking-tighter">{t('green_mobility_guides', language)}</h2>
          <p className="text-gray-500 font-medium">{t('certified_guides', language)}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20">
          <Zap size={20} fill="currentColor" />
          <span className="font-black uppercase tracking-widest text-xs">{t('ev_only_zone', language)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {guides
          .filter(guide => 
            !globalSearchQuery || 
            guide.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
            guide.vehicle_type.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            guide.languages.some(l => l.toLowerCase().includes(globalSearchQuery.toLowerCase()))
          )
          .map((guide) => (
          <motion.div 
            key={guide.guide_id} 
            whileHover={{ scale: 1.02, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col sm:flex-row bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm transition-all"
          >
            <div className="w-full sm:w-48 h-48 sm:h-auto bg-gray-100">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.name}`} className="w-full h-full object-cover" alt={guide.name} />
            </div>
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{guide.name}</h3>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star size={16} fill="currentColor" /> {guide.rating}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg flex items-center gap-1">
                    <Zap size={12} /> {guide.vehicle_type}
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg">
                    {guide.certification_status}
                  </span>
                  <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg">
                    {guide.language}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                <div>
                  <span className="text-xl font-bold text-gray-900">₹{guide.price_per_hour}</span>
                  <span className="text-gray-400 text-sm"> / hr</span>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: '#10b981' }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-colors"
                >
                  {t('book_guide', language)}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderSafety = () => (
    <div className="px-6 py-12 max-w-7xl mx-auto space-y-8">
      <div className="bg-gray-900 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden border border-white/10 shadow-2xl">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/10 blur-[100px] rounded-full -ml-48 -mb-48" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-emerald-400 text-sm font-black uppercase tracking-widest mb-8">
              <Shield size={16} /> {t('guardian_status', language)}: {t('secured', language)}
            </div>
            <h2 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tighter uppercase">{t('guardian_gps', language)}</h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed font-medium">
              {t('rukku_watching', language)}
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-black text-xl mb-1 uppercase tracking-tight">{t('anomaly_detection', language)}</h4>
                  <p className="text-gray-500 text-sm font-medium">{t('anomaly_desc', language)}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Phone className="text-blue-400" />
                </div>
                <div>
                  <h4 className="font-black text-xl mb-1 uppercase tracking-tight">{t('embassy_bridge', language)}</h4>
                  <p className="text-gray-500 text-sm font-medium">{t('embassy_desc', language)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="relative">
              {isSosActive && (
                <div className="absolute inset-0 bg-red-600/20 rounded-full blur-3xl animate-ping" />
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSos}
                className={`w-72 h-72 rounded-full flex flex-col items-center justify-center gap-4 text-white font-black text-5xl shadow-2xl transition-all relative z-10 border-8 border-white/10 ${isSosActive ? 'bg-red-600 animate-pulse' : 'bg-red-500 hover:bg-red-600'}`}
              >
                <AlertTriangle size={80} />
                SOS
              </motion.button>
            </div>
            
            <div className="text-center">
              <p className="text-gray-500 text-sm font-black uppercase tracking-widest mb-4">{t('guardian_status', language)}: <span className="text-emerald-400">{t('secured', language)}</span></p>
              <button className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">
                {t('contact_police', language)}
              </button>
            </div>
            
            {location && (
              <div className={`bg-white/5 backdrop-blur border p-6 rounded-[2rem] w-full max-w-sm transition-colors duration-500 ${isSosActive ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-white/10'}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('live_feed', language)}</span>
                  <span className={`w-3 h-3 rounded-full animate-pulse ${isSosActive ? 'bg-red-500' : 'bg-emerald-500'}`} />
                </div>
                <div className="space-y-2 font-mono text-lg">
                  <p className="text-emerald-400 flex justify-between"><span>{t('lat', language)}</span> <span>{location.lat.toFixed(6)}</span></p>
                  <p className="text-emerald-400 flex justify-between"><span>{t('lng', language)}</span> <span>{location.lng.toFixed(6)}</span></p>
                </div>
                <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="px-6 py-12 max-w-5xl mx-auto h-[85vh] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-2 uppercase">{t('talk_to_rukku', language)}</h2>
          <p className="text-gray-500 text-lg font-medium">{t('rukku_desc', language)}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLiveVoice}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${isLiveVoiceActive ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}
          >
            <Activity size={16} />
            <span className="text-xs font-black uppercase tracking-widest">{isLiveVoiceActive ? t('voice_active', language) : t('live_voice', language)}</span>
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">{t('rukku_online', language)}</span>
          </div>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-6 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-black uppercase tracking-widest focus:ring-4 focus:ring-emerald-500/10 outline-none cursor-pointer transition-all"
          >
            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 mb-8 pr-4 custom-scrollbar">
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30"
            >
              <Cpu size={64} />
            </motion.div>
            <div className="max-w-md">
              <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight uppercase">{t('namaste', language)}</h3>
              <p className="text-gray-500 font-medium leading-relaxed">{t('rukku_intro', language)}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {[t('plan_trip', language), t('show_history', language), t('eco_itinerary', language)].map(q => (
                <button 
                  key={q} 
                  onClick={() => setInputMessage(q)}
                  className="px-6 py-3 rounded-2xl bg-white border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 text-sm font-bold transition-all shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-6 rounded-[2rem] shadow-xl ${msg.role === 'user' ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}>
              <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
              {msg.role === 'ai' && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{t('insight', language)} • {t('verified', language)}</span>
                    {msg.audio && (
                      <button 
                        onClick={() => playAudio(msg.audio!)}
                        className="p-2 hover:bg-emerald-50 rounded-full text-emerald-500 transition-all"
                        title={t('listen', language)}
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Shield size={12} className="text-gray-300" />
                    <Leaf size={12} className="text-gray-300" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isAiLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 p-6 rounded-[2rem] rounded-tl-none shadow-xl flex gap-2">
              <span className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" />
              <span className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
        <div className="relative flex items-center bg-white border border-gray-100 rounded-[3rem] shadow-2xl overflow-hidden">
          <input 
            type="text" 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t('ask_rukku', language)}
            className="flex-1 p-8 bg-transparent text-lg font-medium outline-none"
          />
          <div className="flex items-center gap-3 pr-6">
            <button 
              onClick={handleTranscription}
              disabled={isTranscribing}
              className={`p-4 transition-all rounded-2xl ${isRecording ? 'bg-red-50 text-red-600 animate-pulse' : isTranscribing ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
            >
              {isTranscribing ? <Activity size={28} className="animate-spin" /> : <Mic size={28} className={isRecording ? 'scale-110' : ''} />}
            </button>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: '#047857' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSendMessage}
              className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20"
            >
              {t('execute', language)}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-gray-900">
      {renderPreferenceModal()}
      
      <AnimatePresence mode="wait">
        {isLoginPageOpen ? (
          <motion.div
            key="login-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-white"
          >
            <LoginPage 
              onLoginSuccess={(user) => {
                setUser(user);
                setIsLoginPageOpen(false);
              }}
              onContinueAsGuest={() => {
                setHasSkippedLogin(true);
                setIsLoginPageOpen(false);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isAdmin && (
        <div className="bg-amber-500 text-white py-2 px-6 text-center text-[10px] font-black uppercase tracking-[0.5em] sticky top-0 z-[200] shadow-lg">
          Admin Mode Active — Full System Overrides Enabled
        </div>
      )}
      {/* Global Navigation & Location */}
      <div className="fixed top-6 left-6 z-[100] flex gap-4">
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: '#ecfdf5' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsGlobalMenuOpen(!isGlobalMenuOpen)}
          className="w-14 h-14 bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl flex items-center justify-center shadow-2xl transition-all group"
        >
          <MoreVertical size={24} className="text-gray-900 group-hover:text-emerald-600" />
        </motion.button>

        <div className="hidden md:flex items-center bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl px-6 py-2 gap-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <MapPin size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('current_location', language)}</span>
          </div>
          <input 
            type="text" 
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder={t('enter_origin', language)}
            className="bg-transparent text-sm font-bold outline-none w-40 placeholder:text-gray-300"
          />
        </div>

        <div className="hidden lg:flex items-center bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-2 gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">{user.displayName || 'Traveler'}</span>
                <button onClick={handleLogout} className="text-[8px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors">Logout</button>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} className="w-8 h-8 rounded-full border border-emerald-500/30" alt="User" />
              ) : (
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-black">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginPageOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors"
            >
              <Users size={16} className="text-emerald-400" />
              Login
            </button>
          )}
          <div className="w-px h-8 bg-white/10 mx-2" />
          <Zap size={18} className="text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Karma Points</span>
            <span className="text-xs font-black">{karmaPoints}</span>
          </div>
        </div>

        <AnimatePresence>
          {isGlobalMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className="absolute top-20 left-0 w-64 bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] p-6 overflow-hidden"
            >
              <div className="space-y-2">
                {[{ id: 'home', label: t('home', language), icon: <Home size={18} /> },
                  { id: 'stays', label: t('stays', language), icon: <Users size={18} /> },
                  { id: 'guides', label: t('guides', language), icon: <Zap size={18} /> },
                  { id: 'marketplace', label: t('products', language), icon: <ShoppingBag size={18} /> },
                  { id: 'safety', label: t('safety', language), icon: <Shield size={18} /> },
                  { id: 'chat', label: t('chat', language), icon: <Cpu size={18} /> }
                ].map(item => (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 5, backgroundColor: activeTab === item.id ? '#10b981' : '#f9fafb' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsGlobalMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    {item.icon} {item.label}
                  </motion.button>
                ))}
                
                <motion.button
                  whileHover={{ x: 5, backgroundColor: '#f0fdf4' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowPreferenceModal(true);
                    setIsGlobalMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-gray-500 hover:text-emerald-600 transition-all"
                >
                  <Star size={18} /> Update Preferences
                </motion.button>
                
                <motion.button
                  whileHover={{ x: 5, backgroundColor: '#fef3c7' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (isAdmin) {
                      setIsAdmin(false);
                    } else {
                      setIsAdminLoginOpen(true);
                    }
                    setIsGlobalMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${isAdmin ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <Lock size={18} /> {isAdmin ? 'Logout Admin' : 'Admin Login'}
                </motion.button>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 px-4">{t('menu', language)}</p>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-xs font-black uppercase tracking-widest outline-none cursor-pointer"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Search Bar */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-6">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
          <div className="relative flex items-center bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl px-6 py-3 gap-4">
            <Search size={20} className="text-emerald-500" />
            <input 
              type="text" 
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder={t('global_search_placeholder', language)}
              className="bg-transparent text-sm font-bold outline-none flex-1 placeholder:text-gray-300"
            />
            {globalSearchQuery && (
              <button onClick={() => setGlobalSearchQuery('')} className="text-gray-400 hover:text-gray-900">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Right Logo */}
      <div className="fixed top-6 right-6 z-[100]">
        <Logo imageUrl={logoUrl} className="bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-gray-100 shadow-2xl" />
      </div>

      {/* Floating Action Buttons (Rukku & Lens) */}
      <div className="fixed bottom-8 right-8 z-[90] flex flex-col gap-6 items-end">
        {/* ExploreX Lens Global Trigger */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (destinations.length > 0) {
              setSelectedDest(destinations[0]);
              setIsTimeTravelOpen(true);
            }
          }}
          className="w-20 h-20 bg-amber-500 text-white rounded-[2rem] shadow-2xl flex items-center justify-center border-4 border-white group relative"
        >
          <History size={32} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute right-24 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {t('explorex_lens', language)}
          </span>
        </motion.button>

        {/* Rukku AI Global Trigger */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(true)}
          className="w-20 h-20 bg-emerald-600 text-white rounded-[2rem] shadow-2xl flex items-center justify-center border-4 border-white group relative"
        >
          <Cpu size={32} />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full animate-pulse" />
          <span className="absolute right-24 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {t('talk_to_rukku', language)}
          </span>
        </motion.button>
      </div>

      {/* Global AI Chat Modal */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-4xl h-[90vh] md:h-[80vh] rounded-t-[3rem] md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col relative"
            >
              <button 
                onClick={() => setIsChatOpen(false)}
                className="absolute top-8 right-8 w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all z-10"
              >
                <X size={24} />
              </button>
              {renderChat()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'stays' && renderStays()}
            {activeTab === 'marketplace' && renderMarketplace()}
            {activeTab === 'guides' && renderGuides()}
            {activeTab === 'safety' && renderSafety()}
            {activeTab === 'chat' && renderChat()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <Logo imageUrl={logoUrl} />
            <p className="text-gray-500 leading-relaxed font-medium">
              {t('footer_desc', language)}
            </p>
            <motion.button 
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateLogo}
              disabled={isGeneratingLogo}
              className="px-6 py-2 bg-emerald-500/10 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 transition-all flex items-center gap-2"
            >
              {isGeneratingLogo ? (
                <>
                  <Zap size={12} className="animate-spin" />
                  Generating New Logo...
                </>
              ) : (
                <>
                  <Cpu size={12} />
                  AI Re-Generate Logo
                </>
              )}
            </motion.button>
            <div className="flex gap-4">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 cursor-pointer transition-colors"
              >
                <Globe size={20} />
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 cursor-pointer transition-colors"
              >
                <Users size={20} />
              </motion.div>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-widest text-xs">{t('platform', language)}</h4>
            <ul className="space-y-4 text-gray-500 text-sm font-medium">
              <li onClick={() => setActiveTab('stays')} className="hover:text-emerald-600 cursor-pointer transition-colors uppercase">{t('stays', language)}</li>
              <li onClick={() => setActiveTab('guides')} className="hover:text-emerald-600 cursor-pointer transition-colors uppercase">{t('guides', language)}</li>
              <li onClick={() => setActiveTab('marketplace')} className="hover:text-emerald-600 cursor-pointer transition-colors uppercase">{t('marketplace', language)}</li>
              <li onClick={() => setActiveTab('safety')} className="hover:text-emerald-600 cursor-pointer transition-colors uppercase">{t('safety', language)}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-widest text-xs">{t('sustainability', language)}</h4>
            <ul className="space-y-4 text-gray-500 text-sm font-medium">
              <li className="hover:text-emerald-600 cursor-pointer transition-colors uppercase">{t('carbon_calculator', language)}</li>
              <li className="hover:text-emerald-600 cursor-pointer transition-colors uppercase">{t('eco_certifications', language)}</li>
              <li className="hover:text-emerald-600 cursor-pointer transition-colors uppercase">{t('rural_impact', language)}</li>
              <li className="hover:text-emerald-600 cursor-pointer transition-colors uppercase">{t('green_mobility', language)}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-widest text-xs">{t('newsletter', language)}</h4>
            <p className="text-gray-500 mb-4 text-sm font-medium">{t('newsletter_desc', language)}</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email" className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" />
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest">{t('join', language)}</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-10 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <p>© 2026 ExploreX. {t('footer_rights', language)}</p>
          <div className="flex gap-8">
            <span className="hover:text-gray-600 cursor-pointer uppercase font-black text-[10px] tracking-widest">{t('privacy', language)}</span>
            <span className="hover:text-gray-600 cursor-pointer uppercase font-black text-[10px] tracking-widest">{t('terms', language)}</span>
            <span className="hover:text-gray-600 cursor-pointer uppercase font-black text-[10px] tracking-widest">{t('cookies', language)}</span>
          </div>
        </div>
      </footer>

      {/* Floating SOS Button (Mobile Only) */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSos}
        className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white"
      >
        <AlertTriangle size={28} />
      </motion.button>
      {/* Hidden Audio for TTS */}
      <AnimatePresence>
        {isVrTourOpen && renderVrTour()}
      </AnimatePresence>

      <audio ref={audioRef} className="hidden" />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Maps Grounding Modal */}
      <AnimatePresence>
        {mapsGroundingResults && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                    <Navigation size={20} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t('nearby_places', language)}</h3>
                </div>
                <button onClick={() => setMapsGroundingResults(null)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
                <div className="prose prose-emerald max-w-none">
                  <p className="text-gray-600 leading-relaxed font-medium">{mapsGroundingResults.text}</p>
                </div>
                {mapsGroundingResults.links.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Verified Locations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mapsGroundingResults.links.map((link, i) => (
                        <a 
                          key={i} 
                          href={link.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                        >
                          <MapPin size={18} className="text-emerald-500" />
                          <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700">{link.title || 'View on Maps'}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {isAdminLoginOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Admin Access</h3>
                <button onClick={() => setIsAdminLoginOpen(false)} className="text-gray-400 hover:text-gray-900">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Password</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                    placeholder="Enter admin password"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                  <p className="mt-2 text-[10px] text-gray-400 italic px-2">Hint: Use 'admin123' for demo</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAdminLogin}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-black/10"
                >
                  Login
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
