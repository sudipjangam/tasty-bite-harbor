import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const AUDIO_ENABLED_KEY = "kds_audio_enabled";
const VOICE_ENABLED_KEY = "kds_voice_enabled";
const VOICE_LANG_KEY = "kds_voice_language";
const VOICE_RATE_KEY = "kds_voice_rate";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  locale: string;
  fallbackLocale: string;
  testSample: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    flag: "🇮🇳",
    locale: "mr-IN",
    fallbackLocale: "hi-IN",
    testSample: "नवीन ऑर्डर: टेबल 3, दोन पनीर मसाला, तीन बटर नान, एक दाल तडका",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    flag: "🇮🇳",
    locale: "hi-IN",
    fallbackLocale: "hi-IN",
    testSample: "नया आर्डर: टेबल 3, दो पनीर मसाला, तीन बटर नान, एक दाल तड़का",
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    flag: "🇮🇳",
    locale: "gu-IN",
    fallbackLocale: "hi-IN",
    testSample: "નવો ઓર્ડર: ટેબલ 3, બે પનીર મસાલા, ત્રણ બટર નાન, એક દાળ તડકા",
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    flag: "🇮🇳",
    locale: "bn-IN",
    fallbackLocale: "hi-IN",
    testSample: "নতুন অর্ডার: টেবিল 3, দুই পনির মাসালা, তিন বাটার নান, এক ডাল তড়কা",
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    flag: "🇮🇳",
    locale: "te-IN",
    fallbackLocale: "en-IN",
    testSample: "కొత్త ఆర్డర్: టేబుల్ 3, రెండు పనీర్ మసాలా, మూడు బటర్ నాన్, ఒకటి దాల్ తడ్కా",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    flag: "🇮🇳",
    locale: "ta-IN",
    fallbackLocale: "en-IN",
    testSample: "புதிய ஆர்டர்: டேபிள் 3, இரண்டு பன்னீர் மசாலா, மூன்று பட்டர் நான், ஒன்று தால் தட்கா",
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    flag: "🇮🇳",
    locale: "kn-IN",
    fallbackLocale: "en-IN",
    testSample: "ಹೊಸ ಆರ್ಡರ್: ಟೇಬಲ್ 3, ಎರಡು ಪನೀರ್ ಮಸಾಲಾ, ಮೂರು ಬಟರ್ ನಾನ್, ಒಂದು ದಾಲ್ ತಡ್ಕಾ",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    flag: "🇮🇳",
    locale: "ml-IN",
    fallbackLocale: "en-IN",
    testSample: "പുതിയ ഓർഡർ: ടേബിൾ 3, രണ്ട് പനീർ മസാല, മൂന്ന് ബട്ടർ നാൻ, ഒന്ന് ദാൽ തട്ക",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    flag: "🇮🇳",
    locale: "pa-IN",
    fallbackLocale: "hi-IN",
    testSample: "ਨਵਾਂ ਆਰਡਰ: ਟੇਬਲ 3, ਦੋ ਪਨੀਰ ਮਸਾਲਾ, ਤਿੰਨ ਬਟਰ ਨਾਨ, ਇੱਕ ਦਾਲ ਤੜਕਾ",
  },
  {
    code: "raj",
    name: "Rajasthani (Marwari)",
    nativeName: "राजस्थानी",
    flag: "🇮🇳",
    locale: "hi-IN",
    fallbackLocale: "hi-IN",
    testSample: "नयो आर्डर: टेबल 3, दो पनीर मसाला, तीन बटर नान, एक दाल तड़का",
  },
  {
    code: "en",
    name: "English (India)",
    nativeName: "English",
    flag: "🌐",
    locale: "en-IN",
    fallbackLocale: "en-US",
    testSample: "New Order: Table 3, Two Paneer Masala, Three Butter Naan, One Dal Tadka",
  },
];

// Number to Word Mappings for natural Indian pronunciation
const NUMBER_WORDS: Record<string, Record<number, string>> = {
  mr: { 1: "एक", 2: "दोन", 3: "तीन", 4: "चार", 5: "पाच", 6: "सहा", 7: "सात", 8: "आठ", 9: "नऊ", 10: "दहा" },
  hi: { 1: "एक", 2: "दो", 3: "तीन", 4: "चार", 5: "पांच", 6: "छह", 7: "सात", 8: "आठ", 9: "नौ", 10: "दस" },
  gu: { 1: "એક", 2: "બે", 3: "ત્રણ", 4: "ચાર", 5: "પાંચ", 6: "છ", 7: "સાત", 8: "આઠ", 9: "નવ", 10: "દસ" },
  bn: { 1: "এক", 2: "দুই", 3: "তিন", 4: "চার", 5: "পাঁচ", 6: "ছয়", 7: "সাত", 8: "আট", 9: "নয়", 10: "দশ" },
  te: { 1: "ఒకటి", 2: "రెండు", 3: "మూడు", 4: "నాలుగు", 5: "ఐదు", 6: "ఆరు", 7: "ఏడు", 8: "ఎనిమిది", 9: "తొమ్మిది", 10: "పది" },
  ta: { 1: "ஒன்று", 2: "இரண்டு", 3: "மூன்று", 4: "நான்கு", 5: "ஐந்து", 6: "ஆறு", 7: "ஏழு", 8: "எட்டு", 9: "ஒன்பது", 10: "பத்து" },
  kn: { 1: "ಒಂದು", 2: "ಎರಡು", 3: "ಮೂರು", 4: "ನಾಲ್ಕು", 5: "ಐದು", 6: "ಆರು", 7: "ಏಳು", 8: "ಎಂಟು", 9: "ಒಂಬತ್ತು", 10: "ಹತ್ತು" },
  ml: { 1: "ഒന്ന്", 2: "രണ്ട്", 3: "മൂന്ന്", 4: "നാല്", 5: "അഞ്ച്", 6: "ആറ്", 7: "ഏഴ്", 8: "എട്ട്", 9: "ഒമ്പത്", 10: "പത്ത്" },
  pa: { 1: "ਇੱਕ", 2: "ਦੋ", 3: "ਤਿੰਨ", 4: "ਚਾਰ", 5: "ਪੰਜ", 6: "ਛੇ", 7: "ਸੱਤ", 8: "ਅੱਠ", 9: "ਨੌਂ", 10: "ਦੱਸ" },
  raj: { 1: "एक", 2: "दो", 3: "तीन", 4: "चार", 5: "पांच", 6: "छह", 7: "सात", 8: "आठ", 9: "नौ", 10: "दस" },
  en: { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten" },
};

// Grammar template dictionary per language
const GRAMMAR: Record<string, { newOrder: string; table: string; parcel: string; rush: string }> = {
  mr: { newOrder: "नवीन ऑर्डर", table: "टेबल", parcel: "पार्सल", rush: "लवकर बनवा" },
  hi: { newOrder: "नया आर्डर", table: "टेबल", parcel: "पार्सल", rush: "जल्दी बनाओ" },
  gu: { newOrder: "નવો ઓર્ડર", table: "ટેબલ", parcel: "પાર્સલ", rush: "જલ્દી બનાવો" },
  bn: { newOrder: "নতুন অর্ডার", table: "টেবিল", parcel: "পার্সেল", rush: "তাড়াতাড়ি করুন" },
  te: { newOrder: "కొత్త ఆర్డర్", table: "టేబుల్", parcel: "పార్సెల్", rush: "త్వరగా చేయండి" },
  ta: { newOrder: "புதிய ஆர்டர்", table: "டேபிள்", parcel: "பார்சல்", rush: "சீக்கிரம் செய்யவும்" },
  kn: { newOrder: "ಹೊಸ ಆರ್ಡರ್", table: "ಟೇಬಲ್", parcel: "ಪಾರ್ಸೆಲ್", rush: "ಬೇಗ ಮಾಡಿ" },
  ml: { newOrder: "പുതിയ ഓർഡർ", table: "ടേബിൾ", parcel: "പാഴ്സൽ", rush: "വേഗം തയ്യാറാക്കൂ" },
  pa: { newOrder: "ਨਵਾਂ ਆਰਡਰ", table: "ਟੇਬਲ", parcel: "ਪਾਰਸਲ", rush: "ਛੇਤੀ ਬਣਾਓ" },
  raj: { newOrder: "नयो आर्डर", table: "टेबल", parcel: "पार्सल", rush: "झटपट बणाओ" },
  en: { newOrder: "New Order", table: "Table", parcel: "Takeaway", rush: "Rush Order" },
};

export const useKitchenSounds = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    return localStorage.getItem(AUDIO_ENABLED_KEY) === "true";
  });

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem(VOICE_ENABLED_KEY);
    return saved === null ? true : saved === "true";
  });

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem(VOICE_LANG_KEY) || "mr";
  });

  const [voiceRate, setVoiceRate] = useState<number>(() => {
    const saved = localStorage.getItem(VOICE_RATE_KEY);
    return saved ? parseFloat(saved) : 0.95;
  });

  // Refs for latest values inside async speech queue (prevents stale closures)
  const voiceRateRef = useRef(voiceRate);
  const selectedLanguageRef = useRef(selectedLanguage);
  useEffect(() => { voiceRateRef.current = voiceRate; }, [voiceRate]);
  useEffect(() => { selectedLanguageRef.current = selectedLanguage; }, [selectedLanguage]);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speechQueueRef = useRef<{ text: string; langCode: string }[]>([]);
  const isSpeakingRef = useRef(false);

  // Initialize and load SpeechSynthesis voices (cross-browser: Chrome, Edge, Brave)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
        const indianVoices = voices.filter((v) =>
          /IN|india|hindi|marathi|gujarati|bengali|tamil|telugu|kannada|malayalam|punjabi/i.test(v.lang + v.name)
        );
        if (indianVoices.length > 0) {
          console.log(`[KDS Voice] Loaded ${voices.length} voices. Indian:`, indianVoices.map((v) => `${v.name} (${v.lang})`));
        } else {
          console.log(`[KDS Voice] Loaded ${voices.length} voices. No Indian voices found.`);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Cross-browser retry: Chrome ~500ms, Edge ~2-5s for Microsoft Online voices
    const retryTimers = [100, 500, 1500, 3000, 5000].map((delay) =>
      setTimeout(loadVoices, delay)
    );

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      retryTimers.forEach(clearTimeout);
    };
  }, []);

  // Audio Context Unlock
  const enableAudio = useCallback(() => {
    localStorage.setItem(AUDIO_ENABLED_KEY, "true");
    setIsAudioEnabled(true);
    window.dispatchEvent(new Event("kds_audio_changed"));
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Failed to unlock audio context:", e);
    }
  }, []);

  const disableAudio = useCallback(() => {
    localStorage.setItem(AUDIO_ENABLED_KEY, "false");
    setIsAudioEnabled(false);
    window.dispatchEvent(new Event("kds_audio_changed"));
  }, []);

  const setLanguage = useCallback((langCode: string) => {
    setSelectedLanguage(langCode);
    localStorage.setItem(VOICE_LANG_KEY, langCode);
  }, []);

  const setVoiceEnabledState = useCallback((enabled: boolean) => {
    setIsVoiceEnabled(enabled);
    localStorage.setItem(VOICE_ENABLED_KEY, enabled ? "true" : "false");
  }, []);

  const setSpeechRateState = useCallback((rate: number) => {
    setVoiceRate(rate);
    localStorage.setItem(VOICE_RATE_KEY, rate.toString());
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAudioEnabled(localStorage.getItem(AUDIO_ENABLED_KEY) === "true");
      setIsVoiceEnabled(localStorage.getItem(VOICE_ENABLED_KEY) !== "false");
      setSelectedLanguage(localStorage.getItem(VOICE_LANG_KEY) || "mr");
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("kds_audio_changed", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("kds_audio_changed", handleStorageChange);
    };
  }, []);

  // Web Audio Synthesizer Chimes
  const playTone = useCallback(
    (frequencies: number[], duration: number, type: OscillatorType = "sine", gap = 0.1) => {
      const enabled = localStorage.getItem(AUDIO_ENABLED_KEY) === "true";
      if (!enabled) return;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }

        let time = audioCtx.currentTime;
        frequencies.forEach((freq) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.85, time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(time);
          osc.stop(time + duration);
          time += duration + gap;
        });
      } catch (e) {
        console.warn("Error playing tone:", e);
      }
    },
    []
  );

  const playNewOrder = useCallback(() => {
    playTone([523.25, 659.25], 0.2, "sine", 0.05);
  }, [playTone]);

  const playModified = useCallback(() => {
    playTone([392, 392], 0.12, "triangle", 0.04);
  }, [playTone]);

  const playRushOrder = useCallback(() => {
    playTone([880, 698.46, 880, 698.46], 0.15, "sawtooth", 0.05);
  }, [playTone]);

  const playReadyChime = useCallback(() => {
    playTone([587.33, 880], 0.35, "sine", 0.1);
  }, [playTone]);

  // Smart Voice Finder — cross-browser (Chrome Google, Edge Microsoft, Brave SAPI)
  const findBestVoice = useCallback(
    (langCode: string): { voice: SpeechSynthesisVoice; effectiveLang: string } | null => {
      const voices = availableVoices.length > 0 ? availableVoices : ("speechSynthesis" in window ? window.speechSynthesis.getVoices() : []);
      if (!voices || voices.length === 0) return null;

      const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES[0];
      const normLang = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-");

      // 1. Exact locale match (e.g. "hi-in", "mr-in")
      let match = voices.find((v) => normLang(v) === langObj.locale.toLowerCase());
      if (match) return { voice: match, effectiveLang: match.lang };

      // 2. Language prefix match (e.g. starts with "hi", "mr")
      const prefix = langObj.locale.toLowerCase().split("-")[0];
      match = voices.find((v) => normLang(v).startsWith(prefix + "-") || normLang(v) === prefix);
      if (match) return { voice: match, effectiveLang: match.lang };

      // 3. Voice name contains language name ("Hindi", "Marathi", "Gujarati")
      match = voices.find((v) => new RegExp(langObj.name, "i").test(v.name));
      if (match) return { voice: match, effectiveLang: match.lang };

      // 4. Voice name contains native name ("हिन्दी", "मराठी", "ગુજરાતી")
      if (langObj.nativeName) {
        match = voices.find((v) => v.name.includes(langObj.nativeName));
        if (match) return { voice: match, effectiveLang: match.lang };
      }

      // 5. Edge-specific Microsoft voice names
      const EDGE_VOICE_NAMES: Record<string, RegExp> = {
        hi: /swara|hemant|kalpana/i,
        mr: /marathi/i,
        gu: /dhwani|gujarati/i,
        bn: /tanishaa|bashaar|bengali|bangla/i,
        te: /mohan|shruti|telugu/i,
        ta: /valluvar|tamil/i,
        kn: /gagan|sapna|kannada/i,
        ml: /sobhana|midhun|malayalam/i,
        pa: /punjabi/i,
        en: /david|zira|heera|ravi/i,
      };
      const edgePattern = EDGE_VOICE_NAMES[langCode];
      if (edgePattern) {
        match = voices.find((v) => edgePattern.test(v.name));
        if (match) return { voice: match, effectiveLang: match.lang };
      }

      // 6. Devanagari-script languages → Hindi voice (better than English)
      if (["mr", "raj", "gu", "pa"].includes(langCode)) {
        match = voices.find((v) => normLang(v).startsWith("hi") || /hindi|swara|hemant|kalpana/i.test(v.name));
        if (match) return { voice: match, effectiveLang: "hi-IN" };
      }

      // 7. Fallback locale match (non-English only)
      const fbPrefix = langObj.fallbackLocale.toLowerCase().split("-")[0];
      if (fbPrefix !== "en") {
        match = voices.find((v) => normLang(v).startsWith(fbPrefix + "-") || normLang(v) === fbPrefix);
        if (match) return { voice: match, effectiveLang: match.lang };
      }

      // 8. No match — return null. Caller falls back to English text.
      return null;
    },
    [availableVoices]
  );

  // Speech Queue Processor — with Chrome/Edge TTS bug workarounds
  const processSpeechQueue = useCallback(() => {
    if (speechQueueRef.current.length === 0 || isSpeakingRef.current) return;
    if (!("speechSynthesis" in window)) return;

    const item = speechQueueRef.current.shift();
    if (!item) return;

    isSpeakingRef.current = true;

    // [Fix 1] Cancel stuck utterances
    window.speechSynthesis.cancel();

    // [Fix 2] Resume if paused (Chrome freezes after ~15s inactivity)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // [Fix 3] Force refresh voice list
    window.speechSynthesis.getVoices();

    // [Fix 4] 100ms delay between cancel() and speak() — Chrome/Edge ignores settings without this
    setTimeout(() => {
      const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === item.langCode) || SUPPORTED_LANGUAGES[0];
      const utterance = new SpeechSynthesisUtterance(item.text);

      utterance.rate = voiceRateRef.current;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = langObj.locale;

      const match = findBestVoice(item.langCode);
      if (match?.voice) {
        utterance.voice = match.voice;
        utterance.lang = match.effectiveLang;
        console.log(`[KDS Voice] ✓ Voice: "${match.voice.name}" lang: ${match.effectiveLang} rate: ${utterance.rate}`);
      } else {
        console.log(`[KDS Voice] ⚠ No voice for "${item.langCode}", browser native lang: ${langObj.locale} rate: ${utterance.rate}`);
      }

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setTimeout(() => processSpeechQueue(), 200);
      };

      utterance.onerror = (e) => {
        console.warn(`[KDS Voice] ✗ Error: ${e.error} for lang: ${item.langCode}`);
        isSpeakingRef.current = false;
        setTimeout(() => processSpeechQueue(), 200);
      };

      window.speechSynthesis.speak(utterance);
    }, 100);
  }, [findBestVoice]);

  // Vernacular Speech Dispatcher
  const speakText = useCallback(
    (text: string, langCode?: string) => {
      if (!isAudioEnabled || !isVoiceEnabled) return;
      const targetLang = langCode || selectedLanguageRef.current || "mr";
      speechQueueRef.current.push({ text, langCode: targetLang });
      processSpeechQueue();
    },
    [isAudioEnabled, isVoiceEnabled, processSpeechQueue]
  );

  // Format Order into Vernacular Sentence (with English fallback)
  const speakOrder = useCallback(
    (order: {
      source?: string;
      tableNumber?: string | number;
      orderType?: string;
      items: { name: string; quantity: number }[];
      isRush?: boolean;
    }) => {
      if (!isAudioEnabled) return;
      playNewOrder();

      if (!isVoiceEnabled) return;

      let lang = selectedLanguage || "mr";
      const voiceMatch = findBestVoice(lang);
      if (!voiceMatch && lang !== "en") {
        console.warn(`[KDS Voice] No ${lang} voice found. Falling back to English.`);
        lang = "en";
      }

      const g = GRAMMAR[lang] || GRAMMAR.en;
      const numMap = NUMBER_WORDS[lang] || NUMBER_WORDS.en;

      let locationPart = "";
      if (order.tableNumber) {
        locationPart = `${g.table} ${order.tableNumber}`;
      } else if (order.source && /table/i.test(order.source)) {
        locationPart = order.source;
      } else {
        locationPart = g.parcel;
      }

      const itemsList = order.items
        .map((item) => {
          const qtyWord = numMap[item.quantity] || `${item.quantity}`;
          return `${qtyWord} ${item.name}`;
        })
        .join(", ");

      const rushPrefix = order.isRush ? `${g.rush}! ` : "";
      const sentence = `${rushPrefix}${g.newOrder}: ${locationPart}, ${itemsList}`;

      speakText(sentence, lang);
    },
    [isAudioEnabled, isVoiceEnabled, selectedLanguage, playNewOrder, speakText, findBestVoice]
  );

  // Test Voice Function (with English fallback)
  const testVoice = useCallback(
    (testLang?: string) => {
      enableAudio();
      let lang = testLang || selectedLanguage || "mr";

      const voiceMatch = findBestVoice(lang);
      if (!voiceMatch && lang !== "en") {
        console.warn(`[KDS Voice] No ${lang} voice. Testing with English instead.`);
        lang = "en";
      }

      const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
      speakText(langObj.testSample, lang);
    },
    [enableAudio, selectedLanguage, speakText, findBestVoice]
  );

  // Detected voice name for selected language (settings UI)
  const detectedVoiceName = useMemo(() => {
    const match = findBestVoice(selectedLanguage);
    return match?.voice?.name || null;
  }, [findBestVoice, selectedLanguage]);

  return {
    isAudioEnabled,
    isVoiceEnabled,
    selectedLanguage,
    voiceRate,
    detectedVoiceName,
    supportedLanguages: SUPPORTED_LANGUAGES,
    enableAudio,
    disableAudio,
    setLanguage,
    setVoiceEnabled: setVoiceEnabledState,
    setVoiceRate: setSpeechRateState,
    playNewOrder,
    playModified,
    playRushOrder,
    playReadyChime,
    speakText,
    speakOrder,
    testVoice,
  };
};

export default useKitchenSounds;
