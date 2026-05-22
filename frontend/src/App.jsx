import React, { useState, useEffect, useRef } from 'react';
import Auth from './components/Auth';
import { getWords, getHataDefteri, addHataKelime, deleteHataKelime } from './api';
import { Layers, Trophy, BookOpen, LogOut, HelpCircle, ArrowRight, CheckCircle2, XCircle, RotateCcw, Award, Star, Plus, Trash2, GraduationCap, Flame, Target, TrendingUp, Sparkles, Sun, Moon, Volume2, Timer, ShieldAlert, CheckSquare } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('oyun');
  const [darkMode, setDarkMode] = useState(true);
  
  // Oyun Akış Durumları
  const [gameSetup, setGameSetup] = useState({ source: 'Sistem Havuzu', mode: 'Klasik (Yazarak)', level: 'A1', dir: 'en_to_tr', count: 5, timed: false });
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);

  // Animasyon ve Seçenek Durumları
  const [isFlipped, setIsFlipped] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | 'revealed'
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // ⏰ MODÜL 2: ZAMANA KARŞI YARIŞ (TIMER STATE)
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef(null);

  // Hata Defteri Durumları
  const [hataKelimeleri, setHataKelimeleri] = useState([]);
  const [newWord, setNewWord] = useState({ ingilizce: '', turkce: '', seviye: 'A1' });

  // 🎖️ MODÜL 4: ROZET VE BAŞARIM SİSTEMİ (SIMULATED LOCAL STORAGE)
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  
  const achievementsList = [
    { id: 'first_step', title: 'İlk Adım', desc: 'Sistemde ilk dil seansını tamamla.', icon: '🎯', color: 'from-blue-500 to-indigo-500' },
    { id: 'perfect_strike', title: 'Kusursuz Hafıza', desc: 'Bir seansı %100 başarı oranıyla bitir.', icon: '🔥', color: 'from-amber-500 to-orange-500' },
    { id: 'time_master', title: 'Zaman Bükücü', desc: 'Süreli modda bir seans tamamla.', icon: '⚡', color: 'from-cyan-500 to-blue-500' },
    { id: 'word_collector', title: 'Kelime Koleksiyoneri', desc: 'Hata defterinde veya sözlüğünde 5 kelime barındır.', icon: '📚', color: 'from-emerald-500 to-teal-500' }
  ];

  // İstatistik Verileri (Leaderboard)
  const leaderboardData = [
    { rank: 1, name: "Yusuf", score: 2850, streak: 12, level: "C1", active: true },
    { rank: 2, name: `${user?.isim || 'Yasin'} ${user?.soyisim || 'Kaya'} (Siz)`, score: 2420 + (score * 20), streak: 5, level: "B2", isMe: true, active: true },
    { rank: 3, name: "Emirhan Kartal", score: 2100, streak: 8, level: "B2", active: true },
    { rank: 4, name: "Çağan", score: 1850, streak: 4, level: "B1", active: false },
    { rank: 5, name: "İbrahim", score: 1620, streak: 0, level: "A2", active: false },
  ];

  // Hata defteri ve başarımları tetikle
  useEffect(() => {
    if (user) {
      loadHataDefteri();
      const savedBadges = localStorage.getItem(`badges_${user.id}`);
      if (savedBadges) setUnlockedAchievements(JSON.parse(savedBadges));
    }
  }, [user, activeTab]);

  // ⏰ SAYAÇ ALGORİTMASI SÜREÇ YÖNETİMİ
  useEffect(() => {
    if (gameStarted && !gameFinished && gameSetup.timed && !feedback) {
      setTimeLeft(10);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameStarted, currentIndex, feedback, gameSetup.timed]);

  const loadHataDefteri = async () => {
    try {
      const res = await getHataDefteri(user.id);
      setHataKelimeleri(res.data);
      // Kelime sayısı kontrolü ile başarım tetikleme
      if (res.data.length >= 5) {
        unlockBadge('word_collector');
      }
    } catch (err) {
      console.error("Hata defteri yüklenemedi", err);
    }
  };

  // 🎖️ BAŞARIM KİLİDİ AÇMA FONKSİYONU
  const unlockBadge = (badgeId) => {
    setUnlockedAchievements((prev) => {
      if (prev.includes(badgeId)) return prev;
      const updated = [...prev, badgeId];
      localStorage.setItem(`badges_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  // ⏰ SÜRE BİTTİĞİNDE TETİKLENECEK ALGORİTMA
  const handleTimeOut = () => {
    setFeedback('wrong');
    setIsFlipped(true);
    kaydetHataListesine(words[currentIndex]);
  };

  // 🎧 MODÜL 1: TEXT-TO-SPEECH (SESLİ OKUMA FONKSİYONU)
  const handleSpeak = (e) => {
    e.stopPropagation(); // Kartın dönme animasyonunu tetiklemesin diye durduruyoruz
    if (!words[currentIndex]) return;
    
    // Tarayıcının yerleşik ses motorunu çağırıyoruz
    const utterance = new SpeechSynthesisUtterance(words[currentIndex].ingilizce);
    utterance.lang = 'en-US'; // Amerikan İngilizcesi aksanı
    utterance.rate = 0.85;    // Anlaşılır olması için hafif yavaşlatılmış ritim
    window.speechSynthesis.speak(utterance);
  };

  if (!user) {
    return <Auth onLoginSuccess={(userData) => setUser(userData)} />;
  }

  const generateOptions = (currentWord, allWords) => {
    const correct = gameSetup.dir === 'en_to_tr' ? currentWord.turkce : currentWord.ingilizce;
    let pool = allWords
      .map(w => gameSetup.dir === 'en_to_tr' ? w.turkce : w.ingilizce)
      .filter(val => val !== correct);
    
    if (pool.length < 3) {
      const acilDurumKelimeleri = gameSetup.dir === 'en_to_tr' 
        ? ['elma', 'kitap', 'ev', 'okul', 'araba', 'su', 'masa', 'sandalye']
        : ['apple', 'book', 'home', 'school', 'car', 'water', 'table', 'chair'];
      const takviye = acilDurumKelimeleri.filter(val => val !== correct && !pool.includes(val));
      pool = [...pool, ...takviye];
    }
    
    const shuffledPool = [...new Set(pool)].sort(() => 0.5 - Math.random()).slice(0, 3);
    const finalOptions = [...shuffledPool, correct].sort(() => 0.5 - Math.random());
    setOptions(finalOptions);
  };

  const startSession = async () => {
    try {
      let sessionWords = [];
      if (gameSetup.source === 'Kendi Hata Defterim') {
        if (hataKelimeleri.length === 0) {
          alert('Hata defterinizde henüz kelime yok! Sistem Havuzunda pratik yapıp doldurabilirsiniz.');
          return;
        }
        sessionWords = [...hataKelimeleri].sort(() => 0.5 - Math.random()).slice(0, gameSetup.count);
      } else {
        const res = await getWords(gameSetup.level, gameSetup.count);
        if (res.data.length === 0) {
          alert('Bu seviyede sistemde kelime bulunamadı!');
          return;
        }
        sessionWords = res.data;
      }

      setWords(sessionWords);
      setCurrentIndex(0);
      setScore(0);
      resetQuestionState();
      setGameFinished(false);
      setGameStarted(true);
      
      if (gameSetup.mode === 'Çoktan Seçmeli (4 Şık)') {
        generateOptions(sessionWords[0], sessionWords);
      }
    } catch (err) {
      alert('Kelimeler yüklenirken hata oluştu!');
    }
  };

  const resetQuestionState = () => {
    setUserAnswer('');
    setIsFlipped(false);
    setFeedback(null);
    setSelectedOption(null);
  };

  const kaydetHataListesine = async (wordObj) => {
    try {
      await addHataKelime(user.id, {
        ingilizce: wordObj.ingilizce,
        turkce: wordObj.turkce,
        seviye: wordObj.seviye || 'A1'
      });
      loadHataDefteri();
    } catch (err) {
      console.error("Otomatik hata kaydı başarısız.");
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < words.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      resetQuestionState();
      if (gameSetup.mode === 'Çoktan Seçmeli (4 Şık)') {
        generateOptions(words[nextIdx], words);
      }
    } else {
      // SEANS BAŞARIYLA BİTTİĞİNDE BAŞARIM KONTROLLERİ
      setGameFinished(true);
      unlockBadge('first_step');
      if (score + 1 === words.length || score === words.length) {
        unlockBadge('perfect_strike');
      }
      if (gameSetup.timed) {
        unlockBadge('time_master');
      }
    }
  };

  const handleClassicSubmit = (e) => {
    e.preventDefault();
    if (feedback) return;
    clearInterval(timerRef.current);

    const correct = gameSetup.dir === 'en_to_tr' ? words[currentIndex].turkce : words[currentIndex].ingilizce;
    if (userAnswer.trim().toLowerCase() === correct.toLowerCase()) {
      setFeedback('correct');
      setScore(score + 1);
    } else {
      setFeedback('wrong');
      setIsFlipped(true);
      kaydetHataListesine(words[currentIndex]);
    }
  };

  const handleOptionClick = (option) => {
    if (feedback) return;
    clearInterval(timerRef.current);
    
    setSelectedOption(option);
    const correct = gameSetup.dir === 'en_to_tr' ? words[currentIndex].turkce : words[currentIndex].ingilizce;
    if (option === correct) {
      setFeedback('correct');
      setScore(score + 1);
    } else {
      setFeedback('wrong');
      setIsFlipped(true);
      kaydetHataListesine(words[currentIndex]);
    }
  };

  const handleReveal = () => {
    clearInterval(timerRef.current);
    setFeedback('revealed');
    setIsFlipped(true);
    kaydetHataListesine(words[currentIndex]);
  };

  const handleAddCustomWord = async (e) => {
    e.preventDefault();
    if (!newWord.ingilizce || !newWord.turkce) return;
    try {
      await addHataKelime(user.id, newWord);
      setNewWord({ ingilizce: '', turkce: '', seviye: 'A1' });
      loadHataDefteri();
      alert('Kelime başarıyla kaydedildi!');
    } catch (err) {
      alert('Kelime eklenirken sorun oluştu.');
    }
  };

  const handleDeleteWord = async (id) => {
    if (!confirm('Bu kelimeyi silmek istiyor musunuz?')) return;
    try {
      await deleteHataKelime(id, user.id);
      loadHataDefteri();
    } catch (err) {
      alert('Silme işlemi başarısız.');
    }
  };

  const frontText = words[currentIndex] ? (gameSetup.dir === 'en_to_tr' ? words[currentIndex].ingilizce : words[currentIndex].turkce) : '';
  const backText = words[currentIndex] ? (gameSetup.dir === 'en_to_tr' ? words[currentIndex].turkce : words[currentIndex].ingilizce) : '';
  const correctOptionValue = words[currentIndex] ? (gameSetup.dir === 'en_to_tr' ? words[currentIndex].turkce : words[currentIndex].ingilizce) : '';
  const successRate = words.length > 0 ? Math.round((score / words.length) * 100) : 0;

  return (
    <div className={`min-h-screen flex flex-col md:flex-row antialiased select-none transition-colors duration-300 ${darkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'}`} style={{ fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR SOL MENÜ */}
      <div className={`w-full md:w-72 border-r p-6 flex flex-col justify-between shadow-2xl z-10 transition-all duration-300 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div>
          <div className={`mb-8 flex items-center gap-3 p-4 rounded-2xl border shadow-inner ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
            <div className="bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-sm font-black tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'}`}>KELİME MASTER</h1>
              <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>UNIFIED BUILD v3.0</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <button onClick={() => { setActiveTab('oyun'); setGameStarted(false); setGameFinished(false); }} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-[1.02] ${activeTab === 'oyun' ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg border-l-4 border-cyan-400' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <span className="flex items-center gap-3"><Layers className="w-4 h-4" /> 🚀 Oyun Sahası</span>
            </button>
            
            <button onClick={() => setActiveTab('lig')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-[1.02] ${activeTab === 'lig' ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg border-l-4 border-cyan-400' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <span className="flex items-center gap-3"><Trophy className="w-4 h-4" /> 🏆 Lig & Sıralama</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-black border ${darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>ARENA</span>
            </button>
            
            <button onClick={() => setActiveTab('hata')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-[1.02] ${activeTab === 'hata' ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg border-l-4 border-cyan-400' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <span className="flex items-center gap-3"><BookOpen className="w-4 h-4" /> 📚 Hata Defterim</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${darkMode ? 'bg-slate-900 text-cyan-400 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{hataKelimeleri.length}</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/20 space-y-3">
          <button onClick={() => setDarkMode(!darkMode)} className={`w-full flex items-center justify-center gap-2 font-bold text-xs py-2.5 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-indigo-900 border-slate-300 hover:bg-slate-200'}`}>
            {darkMode ? <><Sun className="w-4 h-4" /> Aydınlık Moda Geç</> : <><Moon className="w-4 h-4" /> Gece Moduna Geç</>}
          </button>

          <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${darkMode ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white shadow-inner uppercase ${darkMode ? 'bg-slate-700' : 'bg-slate-400'}`}>
              {user.isim[0]}{user.soyisim[0]}
            </div>
            <div className="text-sm overflow-hidden">
              <p className="text-slate-400 text-[9px] font-bold tracking-wider uppercase">Geliştirici</p>
              <p className={`font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{user.isim} {user.soyisim}</p>
            </div>
          </div>
          <button onClick={() => setUser(null)} className={`w-full flex items-center justify-center gap-2 font-bold text-xs py-2 rounded-xl border transition-all duration-300 ${darkMode ? 'text-slate-500 bg-slate-800/20 border-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}>
            Oturumu Kapat
          </button>
        </div>
      </div>

      {/* MERKEZİ SAHA */}
      <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full overflow-y-auto">
        
        {/* SEKME 1: OYUN SAHASI */}
        {activeTab === 'oyun' && (
          <div className="transition-all duration-500">
            {!gameStarted ? (
              /* YAPILANDIRMA PANELİ */
              <div className={`p-8 rounded-3xl border shadow-2xl space-y-6 transform hover:scale-[1.002] transition-all duration-300 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div>
                  <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>🎯 Yeni Dil Seansı Konfigürasyonu</h2>
                  <p className="text-xs text-slate-400 mt-1">Gelişmiş antrenman parametrelerini dilediğiniz gibi özelleştirin.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Kelime Kaynak Havuzu</label>
                    <select value={gameSetup.source} onChange={(e) => setGameSetup({...gameSetup, source: e.target.value})} className={`w-full border p-2.5 rounded-xl text-sm font-bold focus:outline-none ${darkMode ? 'bg-[#1e293b] border-slate-700 text-amber-400 focus:border-amber-500' : 'bg-white border-slate-300 text-amber-700 focus:border-amber-500'}`}>
                      <option>Sistem Havuzu</option>
                      <option>Kendi Hata Defterim</option>
                    </select>
                  </div>
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Oyun Çalışma Modu</label>
                    <select value={gameSetup.mode} onChange={(e) => setGameSetup({...gameSetup, mode: e.target.value})} className={`w-full border p-2.5 rounded-xl text-sm focus:outline-none ${darkMode ? 'bg-[#1e293b] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}>
                      <option>Klasik (Yazarak)</option>
                      <option>Çoktan Seçmeli (4 Şık)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Zorluk Derecesi (CEFR)</label>
                    <select disabled={gameSetup.source === 'Kendi Hata Defterim'} value={gameSetup.level} onChange={(e) => setGameSetup({...gameSetup, level: e.target.value})} className={`w-full border p-2.5 rounded-xl text-sm focus:outline-none disabled:opacity-40 ${darkMode ? 'bg-[#1e293b] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}>
                      <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>Karışık</option>
                    </select>
                  </div>
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Soru Seans Hacmi</label>
                    <input type="number" min="1" max="20" value={gameSetup.count} onChange={(e) => setGameSetup({...gameSetup, count: parseInt(e.target.value) || 5})} className={`w-full border p-2.5 rounded-xl text-sm font-bold focus:outline-none ${darkMode ? 'bg-[#1e293b] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`} />
                  </div>
                </div>

                {/* ⏰ MODÜL 2: SÜRELİ MOD SWITCHER EKLEMESİ */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <label className="text-[11px] font-black text-slate-400 block uppercase tracking-widest">Zamana Karşı Yarış Modu (10sn)</label>
                    <p className="text-[10px] text-slate-400 mt-0.5">Her soru için süreyi kısıtlar, adrenalin ve refleks katar.</p>
                  </div>
                  <input type="checkbox" checked={gameSetup.timed} onChange={(e) => setGameSetup({...gameSetup, timed: e.target.checked})} className="w-5 h-5 accent-indigo-600 cursor-pointer" />
                </div>

                <div className={`p-4 rounded-2xl border space-y-2 ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="text-[11px] font-black text-slate-400 block uppercase tracking-widest">Soru Çeviri Akış Algoritması</label>
                  <div className="flex gap-6 text-sm font-bold">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="direction" checked={gameSetup.dir === 'en_to_tr'} onChange={() => setGameSetup({...gameSetup, dir: 'en_to_tr'})} className="accent-slate-700 w-4 h-4" /> İngilizce {"→"} Türkçe</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="direction" checked={gameSetup.dir === 'tr_to_en'} onChange={() => setGameSetup({...gameSetup, dir: 'tr_to_en'})} className="accent-slate-700 w-4 h-4" /> Türkçe {"→"} İngilizce</label>
                  </div>
                </div>

                <button onClick={startSession} className="w-full bg-[#1e293b] hover:bg-[#334155] text-white font-black py-4 rounded-2xl shadow-xl flex justify-center items-center gap-2 transition-all border border-slate-700">
                  <GraduationCap className="w-5 h-5 text-cyan-400" /> SEANSI BAŞLAT VE MEYDAN OKU
                </button>
              </div>
            ) : gameFinished ? (
              /* SEANS SONU ANALİZİ VE GRAFİK PARKI */
              <div className={`p-10 rounded-3xl border shadow-2xl text-center space-y-8 transition-all duration-300 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-center"><div className={`p-5 rounded-full border ${darkMode ? 'bg-slate-800 border-slate-700 text-cyan-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}><Award className="w-12 h-12" /></div></div>
                <div className="space-y-1">
                  <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>Performans Analizi Tamamlandı!</h2>
                  <p className="text-slate-400 text-xs font-medium">İlgili başarımlar ve istatistik tabloları güncellendi.</p>
                </div>

                {/* PROGRESS GRAPH BAR */}
                <div className={`p-5 rounded-2xl border max-w-xl mx-auto space-y-4 ${darkMode ? 'bg-[#0f172a]/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-2 text-slate-400">
                      <span>Başarı Rasyosu</span>
                      <span className="text-indigo-400">%{successRate}</span>
                    </div>
                    <div className={`w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border ${darkMode ? 'border-slate-700' : 'border-slate-300 bg-slate-200'}`}>
                      <div className="h-full bg-gradient-to-r from-slate-500 via-slate-600 to-indigo-900 rounded-full transition-all duration-1000" style={{ width: `${successRate}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`border p-4 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-[#1e293b]/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <Target className="w-7 h-7 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg" />
                      <div className="text-left"><p className="text-[10px] text-slate-400 font-bold uppercase">Net Doğru</p><p className={`text-md font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{score} / {words.length}</p></div>
                    </div>
                    <div className={`border p-4 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-[#1e293b]/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <TrendingUp className="w-7 h-7 text-cyan-500 bg-cyan-500/10 p-1.5 rounded-lg" />
                      <div className="text-left"><p className="text-[10px] text-slate-400 font-bold uppercase">XP</p><p className={`text-md font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>+{score * 20} XP</p></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-4 justify-center">
                  <button onClick={startSession} className="bg-[#1e293b] hover:bg-[#334155] text-white font-black px-7 py-3 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700"><RotateCcw className="w-4 h-4" /> Yeniden Başlat</button>
                  <button onClick={() => { setGameStarted(false); setGameFinished(false); }} className={`font-bold px-7 py-3 rounded-xl text-xs border ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'}`}>Kapat</button>
                </div>
              </div>
            ) : (
              /* CANLI OYUN ARENASI */
              <div className="space-y-6">
                
                {/* ⏰ MODÜL 2: CANLI SÜRE GÖSTERGE BAR BAR (COUNTDOWN) */}
                {gameSetup.timed && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${timeLeft <= 3 ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                      <Timer className={`w-4 h-4 ${timeLeft <= 3 ? 'text-red-500' : 'text-indigo-400'}`} />
                      <span>Kalan Kritik Süre:</span>
                    </div>
                    <span className="text-sm font-black tracking-widest">{timeLeft} Saniye</span>
                  </div>
                )}

                {/* 3D KART TASARIMI */}
                <div className="w-full h-64 perspective-1000 cursor-pointer group" onClick={() => !feedback && setIsFlipped(!isFlipped)}>
                  <div className={`w-full h-full duration-500 transform-style-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                    
                    {/* ÖN YÜZ (SORU KARTI + SPEAKER ICON) */}
                    <div className={`absolute w-full h-full backface-hidden p-8 rounded-3xl border shadow-2xl flex flex-col justify-between items-center transition-all duration-300 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="w-full flex justify-between items-center border-b pb-3 dark:border-slate-800/80">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-md border uppercase tracking-widest ${darkMode ? 'bg-slate-900 text-cyan-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>Soru {currentIndex + 1} / {words.length}</span>
                        
                        {/* 🎧 MODÜL 1: AUDIO TTS SPEAKER BUTTON */}
                        {gameSetup.dir === 'en_to_tr' && (
                          <button onClick={handleSpeak} title="Telaffuz Seslendir" className={`p-2 rounded-xl border hover:scale-105 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'}`}>
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="text-center space-y-1">
                        <div className={`text-4xl font-black tracking-wide ${darkMode ? 'text-white' : 'text-slate-800'}`}>{frontText}</div>
                        {words[currentIndex]?.telaffuz && gameSetup.dir === 'en_to_tr' && (
                          <p className={`text-sm font-bold italic ${darkMode ? 'text-cyan-400' : 'text-slate-500'}`}>{words[currentIndex].telaffuz}</p>
                        )}
                      </div>
                      
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 animate-pulse">🔄 Çevirmek İçin Tıkla</span>
                    </div>

                    {/* ARKA YÜZ */}
                    <div className={`absolute w-full h-full backface-hidden p-8 rounded-3xl border-2 shadow-2xl flex flex-col justify-between items-center rotate-y-180 ${darkMode ? 'bg-gradient-to-br from-[#1e293b] to-[#131c2e] border-slate-700' : 'bg-gradient-to-br from-slate-100 to-white border-slate-300'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">💡 Karşılığı</span>
                      
                      <div className="text-center">
                        <div className="text-4xl font-black text-slate-700 dark:text-indigo-400 tracking-wide">{backText}</div>
                      </div>

                      <div className={`w-full border px-5 py-2.5 rounded-2xl text-center max-w-lg shadow-inner ${darkMode ? 'bg-[#0f172a]/80 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🌐 Contextual Example (Free Dictionary API)</p>
                        <p className={`text-xs font-medium italic mt-1 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          "{words[currentIndex]?.ornek_cumle || 'Örnek cümle havuzda aranamadı.'}"
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* FEEDBACK ROW */}
                {feedback && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 font-bold border text-xs shadow-md ${feedback === 'correct' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    {feedback === 'correct' ? <><CheckCircle2 className="w-4 h-4" /> Tebrikler! Doğru veri eşleşmesi.</> : <><XCircle className="w-4 h-4" /> Hatalı/Süre Bitti! Kelime hata defterine şutlandı.</>}
                  </div>
                )}

                {/* MOD 1: KLASİK YAZARAK OYNAMA */}
                {gameSetup.mode === 'Klasik (Yazarak)' ? (
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <form onSubmit={handleClassicSubmit} className="flex gap-3">
                      <input type="text" disabled={feedback !== null} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Cevabı klavyeden dökün..." className={`flex-1 p-3.5 rounded-xl text-md text-center font-bold border focus:outline-none disabled:opacity-40 ${darkMode ? 'bg-[#0f172a] border-slate-800 text-white focus:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-300'}`} />
                      {!feedback && <button type="submit" className="bg-[#1e293b] border border-slate-700 text-white font-black px-7 rounded-xl text-xs hover:bg-slate-800 transition-all">ONAYLA</button>}
                    </form>
                  </div>
                ) : (
                  /* MOD 2: 4 ŞIKLI ÇOKTAN SEÇMELİ BUTONLAR */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {options.map((option, i) => {
                      let btnStyle = darkMode 
                        ? "bg-[#1e293b] hover:bg-slate-800 border-slate-800/80 text-slate-300 hover:text-white" 
                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900";
                      
                      if (feedback) {
                        if (option === correctOptionValue) btnStyle = "bg-emerald-600 border-emerald-500 text-white shadow-lg font-black";
                        else if (selectedOption === option && feedback === 'wrong') btnStyle = "bg-red-600 border-red-500 text-white shadow-lg font-black line-through opacity-85";
                        else btnStyle = darkMode ? "bg-[#0f172a] text-slate-700 border-slate-900 opacity-30" : "bg-slate-100 text-slate-400 border-slate-200 opacity-30 cursor-not-allowed";
                      }
                      return (
                        <button key={i} disabled={feedback !== null} onClick={() => handleOptionClick(option)} className={`p-4 rounded-2xl text-left border text-sm font-bold transition-all duration-200 flex justify-between items-center shadow-sm ${btnStyle}`}>
                          <span>{option}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded ${darkMode ? 'bg-black/20 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>OP {String.fromCharCode(65 + i)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* BOTTOM CONTROL GRID */}
                <div className={`flex gap-4 justify-between items-center p-4 rounded-2xl border ${darkMode ? 'bg-[#1e293b]/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2"><span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Seans Skoru:</span><span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${darkMode ? 'bg-slate-900 text-cyan-400 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{score} / {words.length}</span></div>
                  <div className="flex gap-2">
                    {!feedback && <button onClick={handleReveal} className={`font-bold px-4 py-2.5 rounded-xl text-xs border transition-all ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'}`}>Pas Geç</button>}
                    {feedback && <button onClick={nextQuestion} className="bg-[#1e293b] hover:bg-[#334155] text-white border border-slate-700 font-black px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-1 transition-all">{currentIndex + 1 === words.length ? 'Bitir' : 'Sonraki'} <ArrowRight className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEKME 2: LIG ARENASI VE BAŞARIM PARKI */}
        {activeTab === 'lig' && (
          <div className="space-y-6 transition-all duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`border p-5 rounded-2xl flex items-center gap-4 ${darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-500/5 border-amber-300'}`}>
                <Flame className="w-9 h-9 text-amber-500" />
                <div><p className="text-[10px] text-slate-400 font-bold uppercase">Seri</p><p className={`text-md font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>5 Gün Kesintisiz</p></div>
              </div>
              <div className={`border p-5 rounded-2xl flex items-center gap-4 ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Trophy className="w-9 h-9 text-slate-600" />
                <div><p className="text-[10px] text-slate-400 font-bold uppercase">Lig Katmanı</p><p className={`text-md font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>Platin Elmas Kümesi</p></div>
              </div>
              <div className={`border p-5 rounded-2xl flex items-center gap-4 ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Sparkles className="w-9 h-9 text-slate-500" />
                <div><p className="text-[10px] text-slate-400 font-bold uppercase">Toplam Skor</p><p className={`text-md font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{2420 + (score * 20)} XP</p></div>
              </div>
            </div>

            {/* 🎖️ MODÜL 4: ROZET VE BAŞARIM VİTRİNİ ARAYÜZÜ */}
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div>
                <h3 className={`text-md font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>🎖️ Kazanılan Akademik Başarı Rozetleri</h3>
                <p className="text-xs text-slate-400 mt-0.5">Uygulama içinde hedefleri tamamlayarak rozetlerin kilidini açın.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {achievementsList.map((badge) => {
                  const isUnlocked = unlockedAchievements.includes(badge.id);
                  return (
                    <div key={badge.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center justify-between relative overflow-hidden transition-all duration-300 ${isUnlocked ? `bg-gradient-to-br ${badge.color} text-white border-transparent shadow-lg scale-100` : darkMode ? 'bg-slate-900/40 border-slate-800 text-slate-600 opacity-40' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'}`}>
                      <span className="text-3xl mb-2">{badge.icon}</span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">{badge.title}</h4>
                        <p className={`text-[10px] font-medium mt-1 leading-tight ${isUnlocked ? 'text-white/80' : 'text-slate-400'}`}>{badge.desc}</p>
                      </div>
                      {isUnlocked && <span className="absolute top-1 right-2 text-[10px] font-black tracking-tight text-white/50">KİLİTSİZ</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEADERBOARD TABLOSU */}
            <div className={`rounded-3xl border shadow-xl overflow-hidden ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>🏆 Haftalık Global Rekabet Arenası</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Sınıf ve proje arkadaşlarınızla eş zamanlı sıralama tablosu</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-black text-slate-400 uppercase tracking-wider ${darkMode ? 'bg-[#0f172a]/20 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                      <th className="p-4 text-center w-16">Sıra</th>
                      <th className="p-4">Kullanıcı</th>
                      <th className="p-4">Mevcut Seviye</th>
                      <th className="p-4">Seri</th>
                      <th className="p-4 text-right">Skor</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs font-bold ${darkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {leaderboardData.map((player) => (
                      <tr key={player.rank} className={`transition-all ${player.isMe ? 'bg-slate-500/10' : darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 text-center">{player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : player.rank}</td>
                        <td className="p-4 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${player.active ? 'bg-emerald-500 shadow-sm' : 'bg-slate-400'}`}></div>
                          <span className={player.isMe ? 'text-indigo-600 dark:text-cyan-400 font-black' : darkMode ? 'text-slate-200' : 'text-slate-700'}>{player.name}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${darkMode ? 'bg-slate-900 text-slate-400 border border-slate-800' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{player.level}</span>
                        </td>
                        <td className="p-4 text-amber-500 font-black">{player.streak > 0 ? `🔥 ${player.streak} Gün` : '-'}</td>
                        <td className={`p-4 text-right font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{player.score.toLocaleString()} XP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* HATA DEFTERI */}
        {activeTab === 'hata' && (
          <div className="space-y-6 transition-all duration-500">
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-md font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}><Plus className="w-5 h-5 text-slate-400 inline mr-1" /> Kişisel Bellek Havuzuna Kelime Ekle</h3>
              <form onSubmit={handleAddCustomWord} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div><label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">İngilizce Argüman</label><input type="text" required value={newWord.ingilizce} onChange={(e) => setNewWord({...newWord, ingilizce: e.target.value})} placeholder="Örn: Refactor" className={`w-full border p-2.5 rounded-xl text-xs font-semibold focus:outline-none ${darkMode ? 'bg-[#0f172a] border-slate-800 text-white focus:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-300'}`} /></div>
                <div><label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Türkçe Semantik</label><input type="text" required value={newWord.turkce} onChange={(e) => setNewWord({...newWord, turkce: e.target.value})} placeholder="Örn: İyileştirmek" className={`w-full border p-2.5 rounded-xl text-xs font-semibold focus:outline-none ${darkMode ? 'bg-[#0f172a] border-slate-800 text-white focus:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-300'}`} /></div>
                <div><label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Zorluk</label><select value={newWord.seviye} onChange={(e) => setNewWord({...newWord, seviye: e.target.value})} className={`w-full border p-2.5 rounded-xl text-xs font-bold focus:outline-none ${darkMode ? 'bg-[#0f172a] border-slate-300 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></div>
                <button type="submit" className="bg-[#1e293b] border border-slate-700 text-white font-black py-2.5 px-4 rounded-xl text-xs hover:bg-slate-800 transition-all shadow-md">KAYDET</button>
              </form>
            </div>

            <div className={`rounded-3xl border shadow-xl overflow-hidden ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div><h2 className={`text-md font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>📚 Hata Defteri Dezenfeksiyon Paneli</h2><p className="text-xs text-slate-400 mt-0.5">Zayıf kelimeleri ezberledikten sonra buradan temizleyebilirsiniz.</p></div>
                <span className={`font-black px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-slate-900 text-cyan-400 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>{hataKelimeleri.length} Kelime</span>
              </div>
              {hataKelimeleri.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm font-semibold">Zayıf bellek hücreniz bulunmuyor. Sistem havuzu testlerine devam edin!</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className={`border-b text-[10px] font-black text-slate-400 uppercase tracking-wider ${darkMode ? 'bg-[#0f172a]/20 border-slate-800' : 'bg-slate-100 border-slate-200'}`}><th className="p-4">İngilizce</th><th className="p-4">Türkçe</th><th className="p-4">Seviye</th><th className="p-4 text-right">Eylem</th></tr></thead>
                    <tbody className={`divide-y text-xs font-bold ${darkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {hataKelimeleri.map((kelime) => (
                        <tr key={kelime.id} className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                          <td className={`p-4 font-black ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{kelime.ingilizce}</td>
                          <td className="p-4 text-slate-400">{kelime.turkce}</td>
                          <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${darkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>{kelime.seviye}</span></td>
                          <td className="p-4 text-right"><button onClick={() => handleDeleteWord(kelime.id)} className="text-red-400 hover:text-red-500 p-2 rounded-xl bg-red-500/5 transition-all"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}