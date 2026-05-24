import React, { useState, useEffect, useRef } from 'react';
import Auth from './components/Auth';
import { getWords, getHataDefteri, addHataKelime, deleteHataKelime, addXp, getLiveLeaderboard } from './api';
import { Layers, Trophy, BookOpen, LogOut, HelpCircle, ArrowRight, CheckCircle2, XCircle, RotateCcw, Award, Plus, Trash2, GraduationCap, Flame, Target, TrendingUp, Sparkles, Sun, Moon, Volume2, Timer, Compass, ShieldCheck, Zap, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('oyun');
  const [darkMode, setDarkMode] = useState(false);
  
  // Oyun Akış Durumları
  const [gameSetup, setGameSetup] = useState({ source: 'Sistem Havuzu', mode: 'Klasik (Yazarak)', level: 'A1', dir: 'en_to_tr', count: 5, timed: false });
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [sessionWrongCount, setSessionWrongCount] = useState(0);
  const [gainedXpThisSession, setGainedXpThisSession] = useState(0);

  // İnteraktif Popover / Bilgi Kutuları Durumları
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [showLeagueInfo, setShowLeagueInfo] = useState(false);

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

  // CANLI DATABASE LEADERBOARD DURUMU
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);

  // 🎖️ MODÜL 4: ROZET VE BAŞARIM SİSTEMİ (SIMULATED LOCAL STORAGE)
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  
  const achievementsList = [
    { id: 'first_step', title: 'İlk Adım', desc: 'Sistemde ilk dil testini tamamla.', icon: '🎯', color: 'from-blue-500 to-indigo-500' },
    { id: 'perfect_strike', title: 'Kusursuz Hafıza', desc: 'Bir testi %100 başarı oranıyla bitir.', icon: '🔥', color: 'from-amber-500 to-orange-500' },
    { id: 'time_master', title: 'Zaman Bükücü', desc: 'Süreli modda bir test tamamla.', icon: '⚡', color: 'from-cyan-500 to-blue-500' },
    { id: 'word_collector', title: 'Kelime Koleksiyoneri', desc: 'Hata defterinde veya sözlüğünde 5 kelime barındır.', icon: '📚', color: 'from-emerald-500 to-teal-500' }
  ];

  // Hata defteri, sıralama ve başarımları tetikle
  useEffect(() => {
    if (user) {
      loadHataDefteri();
      loadLiveLeaderboard();
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
      if (res.data.length >= 5) {
        unlockBadge('word_collector');
      }
    } catch (err) {
      console.error("Hata defteri yüklenemedi", err);
    }
  };

  const loadLiveLeaderboard = async () => {
    try {
      const res = await getLiveLeaderboard();
      setLiveLeaderboard(res.data);
    } catch (err) {
      console.error("Canlı sıralama veritabanından çekilemedi", err);
    }
  };

  const unlockBadge = (badgeId) => {
    setUnlockedAchievements((prev) => {
      if (prev.includes(badgeId)) return prev;
      const updated = [...prev, badgeId];
      localStorage.setItem(`badges_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleTimeOut = () => {
    setFeedback('wrong');
    setIsFlipped(true);
    setSessionWrongCount(prev => prev + 1);
    kaydetHataListesine(words[currentIndex]);
  };

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (!words[currentIndex]) return;
    
    const utterance = new SpeechSynthesisUtterance(words[currentIndex].ingilizce);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
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
      setSessionWrongCount(0);
      setGainedXpThisSession(0);
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

  const nextQuestion = async () => {
    if (currentIndex + 1 < words.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      resetQuestionState();
      if (gameSetup.mode === 'Çoktan Seçmeli (4 Şık)') {
        generateOptions(words[nextIdx], words);
      }
    } else {
      try {
        const res = await addXp(user.id, gameSetup.level, score, sessionWrongCount);
        setGainedXpThisSession(res.data.kazanilan_xp);
        setUser({ ...user, xp: res.data.new_xp });
      } catch (err) {
        console.error("XP backend kaydı başarısız oldu.");
      }

      setGameFinished(true);
      unlockBadge('first_step');
      if (score === words.length) {
        unlockBadge('perfect_strike');
      }
      if (gameSetup.timed) {
        unlockBadge('time_master');
      }
      loadLiveLeaderboard();
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
      setSessionWrongCount(prev => prev + 1);
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
      setSessionWrongCount(prev => prev + 1);
      kaydetHataListesine(words[currentIndex]);
    }
  };

  const handleReveal = () => {
    clearInterval(timerRef.current);
    setFeedback('revealed');
    setIsFlipped(true);
    setSessionWrongCount(prev => prev + 1);
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

  // 🏆 LİG VE SEVİYE HESAPLAMA SİHİRBAZI
  const currentXp = user?.xp || 0;
  let leagueName = "Derecesiz";
  let leagueBadge = "⚪";
  let nextLeagueThreshold = 1000;
  let prevLeagueThreshold = 0;
  let leagueColorClass = "text-slate-400";

  if (currentXp >= 5000) {
    leagueName = "Altın Ligi"; leagueBadge = "👑"; nextLeagueThreshold = 10000; prevLeagueThreshold = 5000; leagueColorClass = "text-amber-400 font-black";
  } else if (currentXp >= 2500) {
    leagueName = "Gümüş Ligi"; leagueBadge = "⚔️"; nextLeagueThreshold = 5000; prevLeagueThreshold = 2500; leagueColorClass = "text-slate-300 font-black";
  } else if (currentXp >= 1000) {
    leagueName = "Bronz Ligi"; leagueBadge = "🛡️"; nextLeagueThreshold = 2500; prevLeagueThreshold = 1000; leagueColorClass = "text-amber-600 font-black";
  }

  const leagueProgressPercent = Math.min(100, Math.max(0, ((currentXp - prevLeagueThreshold) / (nextLeagueThreshold - prevLeagueThreshold)) * 100));

  const frontText = words[currentIndex] ? (gameSetup.dir === 'en_to_tr' ? words[currentIndex].ingilizce : words[currentIndex].turkce) : '';
  const backText = words[currentIndex] ? (gameSetup.dir === 'en_to_tr' ? words[currentIndex].turkce : words[currentIndex].ingilizce) : '';
  const correctOptionValue = words[currentIndex] ? (gameSetup.dir === 'en_to_tr' ? words[currentIndex].turkce : words[currentIndex].ingilizce) : '';
  const successRate = words.length > 0 ? Math.round((score / words.length) * 100) : 0;
  const myRank = liveLeaderboard.find(p => p.id === user.id)?.rank || '-';

  return (
    <div className={`min-h-screen flex flex-col md:flex-row antialiased select-none transition-colors duration-300 ${darkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'}`} style={{ fontFamily: 'sans-serif' }}>
      
      {/* SOL MENÜ DUVARI */}
      <div className={`w-full md:w-72 border-r p-6 flex flex-col justify-between shadow-2xl z-10 transition-all duration-300 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div>
          {/* 🎯 VOCABSTRIKE ÇERÇEVESİZ PREMIUM YUVARLAK LOGO ENTEGRASYONU */}
          <div className={`mb-8 flex flex-col items-center gap-3 p-4 rounded-2xl border shadow-inner text-center transition-all duration-300 ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
            <div className="w-32 h-32 flex items-center justify-center p-1 group overflow-hidden rounded-full">
              <img 
                src="/LOGO.png" 
                alt="VocabStrike Logo" 
                className="w-full h-full object-contain rounded-full select-none transition-transform duration-300 group-hover:scale-105" 
              />
            </div>
            <div>
              <h1 className="text-base font-black tracking-widest uppercase bg-linear-to-r from-red-500 to-indigo-500 bg-clip-text text-transparent">
                VOCABSTRIKE
              </h1>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>VERSION v1.0</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <button onClick={() => { setActiveTab('oyun'); setGameStarted(false); setGameFinished(false); }} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-[1.02] ${activeTab === 'oyun' ? 'bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg border-l-4 border-cyan-400' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <span className="flex items-center gap-3"><Layers className="w-4 h-4" /> 🚀 Soru ve Oyun Sahası</span>
            </button>
            
            <button onClick={() => setActiveTab('lig')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-[1.02] ${activeTab === 'lig' ? 'bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg border-l-4 border-cyan-400' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <span className="flex items-center gap-3"><Trophy className="w-4 h-4" /> 🏆 Canlı Sıralama</span>
            </button>
            
            <button onClick={() => setActiveTab('hata')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-[1.02] ${activeTab === 'hata' ? 'bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg border-l-4 border-cyan-400' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <span className="flex items-center gap-3"><BookOpen className="w-4 h-4" /> 📚 Kelime & Hata Defteri</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${darkMode ? 'bg-slate-900 text-cyan-400 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{hataKelimeleri.length}</span>
            </button>

            <button onClick={() => setActiveTab('rehber')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-[1.02] ${activeTab === 'rehber' ? 'bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg border-l-4 border-cyan-400' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <span className="flex items-center gap-3"><Compass className="w-4 h-4" /> 📖 Akademi Kılavuzu</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/20 space-y-3">
          <button onClick={() => setDarkMode(!darkMode)} className={`w-full flex items-center justify-center gap-2 font-bold text-xs py-2.5 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-indigo-900 border-slate-300 hover:bg-slate-200'}`}>
            {darkMode ? <><Sun className="w-4 h-4" /> Aydınlık Görünüme Geç</> : <><Moon className="w-4 h-4" /> Gece Görünümüne Geç</>}
          </button>

          <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${darkMode ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white shadow-inner uppercase ${darkMode ? 'bg-slate-700' : 'bg-slate-400'}`}>
              {user.isim[0]}{user.soyisim[0]}
            </div>
            <div className="text-sm overflow-hidden">
              <p className="text-slate-400 text-[9px] font-bold tracking-wider uppercase">Toplam Başarı Puanın</p>
              <p className={`font-black text-xs truncate ${darkMode ? 'text-cyan-400' : 'text-indigo-700'}`}>{currentXp} XP</p>
            </div>
          </div>
          <button onClick={() => setUser(null)} className={`w-full flex items-center justify-center gap-2 font-bold text-xs py-2 rounded-xl border transition-all duration-300 ${darkMode ? 'text-slate-500 bg-slate-800/20 border-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}>
            Oturumu Kapat
          </button>
        </div>
      </div>

      {/* MERKEZİ SAHA */}
      <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full overflow-y-auto relative">
        
        {/* ==================== MOUSE ILE TIKLAYINCA AÇILAN POP-UP PENCERELERİ (MODALS) ==================== */}
        {showXpInfo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowXpInfo(false)}>
            <div className={`p-6 rounded-2xl border shadow-2xl max-w-md w-full space-y-4 ${darkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-1.5 text-indigo-400"><Zap className="w-4 h-4 text-amber-400" /> XP Dinamik Puanlama Formülü</h3>
                <button onClick={() => setShowXpInfo(false)} className="text-slate-400 font-bold hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Sistemde puanlama CEFR zorluk seviyelerine göre doğru orantılı çarpan katsayılarıyla çalışır. Temel kural **A1 için Doğru (+100 XP), Yanlış (-50 XP)** seviyesindedir.</p>
              <div className="overflow-hidden rounded-xl border dark:border-slate-800 text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/30 font-bold text-slate-400"><tr><th className="p-2">CEFR Seviyesi</th><th className="p-2">Doğru Puanı</th><th className="p-2">Hata Cezası</th></tr></thead>
                  <tbody className="divide-y dark:divide-slate-800 text-slate-400">
                    <tr><td className="p-2 font-bold">A1 (Temel Seviye)</td><td className="p-2 text-emerald-500 font-bold">+100 XP</td><td className="p-2 text-red-500 font-bold">-50 XP</td></tr>
                    <tr><td className="p-2 font-bold">A2 (Orta Altı Seviye)</td><td className="p-2 text-emerald-500 font-bold">+120 XP</td><td className="p-2 text-red-500 font-bold">-60 XP</td></tr>
                    <tr><td className="p-2 font-bold">B1 (Orta Seviye)</td><td className="p-2 text-emerald-500 font-bold">+150 XP</td><td className="p-2 text-red-500 font-bold">-75 XP</td></tr>
                    <tr><td className="p-2 font-bold">B2 (Orta Üstü Seviye)</td><td className="p-2 text-emerald-500 font-bold">+180 XP</td><td className="p-2 text-red-500 font-bold">-90 XP</td></tr>
                    <tr><td className="p-2 font-bold">C1 (İleri Kademe)</td><td className="p-2 text-emerald-500 font-bold">+200 XP</td><td className="p-2 text-red-500 font-bold">-100 XP</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showLeagueInfo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowLeagueInfo(false)}>
            <div className={`p-6 rounded-2xl border shadow-2xl max-w-md w-full space-y-4 ${darkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-1.5 text-cyan-400"><Trophy className="w-4 h-4 text-amber-500" /> Akademi Lig Kademeleri</h3>
                <button onClick={() => setShowLeagueInfo(false)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Veritabanındaki toplam XP birikiminize göre lig rütbeniz gerçek zamanlı hesaplanır. Sıralama basamakları şu şekildedir:</p>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-xl border dark:border-slate-800"><span>⚪ Derecesiz Kademe</span><span className="text-slate-500">0 - 999 XP</span></div>
                <div className="flex justify-between items-center bg-amber-600/10 p-2.5 rounded-xl border border-amber-600/20"><span>🛡️ Bronz Dil Ligi</span><span className="text-amber-600 font-bold">1,000 XP ve Üstü</span></div>
                <div className="flex justify-between items-center bg-slate-300/10 p-2.5 rounded-xl border border-slate-300/20"><span>⚔️ Gümüş Dil Ligi</span><span className="text-slate-300 font-bold">2,500 XP ve Üstü</span></div>
                <div className="flex justify-between items-center bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20"><span>👑 Altın Elmas Ligi</span><span className="text-amber-400 font-bold">5,000 XP ve Üstü</span></div>
              </div>
            </div>
          </div>
        )}

        {/* SEKME 1: OYUN SAHASI */}
        {activeTab === 'oyun' && (
          <div className="transition-all duration-500">
            {!gameStarted ? (
              /* YAPILANDIRMA PANELİ */
              <div className={`p-8 rounded-3xl border shadow-2xl space-y-6 transform hover:scale-[1.002] transition-all duration-300 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div>
                  <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>🎯 Test Yapılandırması</h2>
                  <p className="text-xs text-slate-400 mt-1">Dilediğiniz zorluk seviyesi, soru sayısı ve çalışma metodunu seçerek testi başlatabilirsiniz.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Kelime Havuzu Seçimi</label>
                    <select value={gameSetup.source} onChange={(e) => setGameSetup({...gameSetup, source: e.target.value})} className={`w-full border p-2.5 rounded-xl text-sm font-bold focus:outline-none ${darkMode ? 'bg-[#1e293b] border-slate-700 text-amber-400 focus:border-amber-500' : 'bg-white border-slate-300 text-amber-700 focus:border-amber-500'}`}>
                      <option>Sistem Havuzu</option>
                      <option>Kendi Hata Defterim</option>
                    </select>
                  </div>
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Çalışma Metodu</label>
                    <select value={gameSetup.mode} onChange={(e) => setGameSetup({...gameSetup, mode: e.target.value})} className={`w-full border p-2.5 rounded-xl text-sm focus:outline-none ${darkMode ? 'bg-[#1e293b] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}>
                      <option>Klasik (Yazarak)</option>
                      <option>Çoktan Seçmeli (4 Şık)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Dil Seviyesi (Zorluk)</label>
                    <select disabled={gameSetup.source === 'Kendi Hata Defterim'} value={gameSetup.level} onChange={(e) => setGameSetup({...gameSetup, level: e.target.value})} className={`w-full border p-2.5 rounded-xl text-sm focus:outline-none disabled:opacity-40 ${darkMode ? 'bg-[#1e293b] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}>
                      <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>Karışık</option>
                    </select>
                  </div>
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Testte Bulunan Soru Sayısı</label>
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
                  <label className="text-[11px] font-black text-slate-400 block uppercase tracking-widest">Soru Yönü Algoritması</label>
                  <div className="flex gap-6 text-sm font-bold">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="direction" checked={gameSetup.dir === 'en_to_tr'} onChange={() => setGameSetup({...gameSetup, dir: 'en_to_tr'})} className="accent-slate-700 w-4 h-4" /> İngilizce {"→"} Türkçe</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="direction" checked={gameSetup.dir === 'tr_to_en'} onChange={() => setGameSetup({...gameSetup, dir: 'tr_to_en'})} className="accent-slate-700 w-4 h-4" /> Türkçe {"→"} İngilizce</label>
                  </div>
                </div>

                <button onClick={startSession} className="w-full bg-[#1e293b] hover:bg-[#334155] text-white font-black py-4 rounded-2xl shadow-xl flex justify-center items-center gap-2 transition-all border border-slate-700 cursor-pointer">
                  <GraduationCap className="w-5 h-5 text-cyan-400" /> KELİME PRATİĞİNİ BAŞLAT
                </button>
              </div>
            ) : gameFinished ? (
              /* SEANS SONU ANALİZİ VE GRAFİK PARKI */
              <div className={`p-10 rounded-3xl border shadow-2xl text-center space-y-10 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-center"><div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full"><Award className="w-12 h-12" /></div></div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-emerald-500">Test Başarıyla Tamamlandı!</h2>
                  <p className="text-slate-400 text-xs">Puan dengeniz ve kelime verileriniz veritabanına asenkron olarak yazıldı.</p>
                </div>

                {/* PROGRESS GRAPH BAR */}
                <div className={`p-6 rounded-2xl border max-w-xl mx-auto space-y-4 ${darkMode ? 'bg-[#0f172a]/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <span>Doğruluk Oranı</span>
                      <span className="text-indigo-400">%{successRate}</span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-200'}`}>
                      <div className="h-full bg-linear-to-r from-slate-500 via-slate-600 to-indigo-900 rounded-full transition-all duration-1000" style={{ width: `${successRate}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2 text-xs font-bold">
                    <div className={`border p-4 rounded-xl text-left ${darkMode ? 'bg-[#1e293b]/80 border-slate-800' : 'bg-white border-slate-200'}`}><p className="text-[10px] text-slate-400 uppercase">Doğru</p><p className="text-md font-black text-emerald-500">+{score}</p></div>
                    <div className={`border p-4 rounded-xl text-left ${darkMode ? 'bg-[#1e293b]/80 border-slate-800' : 'bg-white border-slate-200'}`}><p className="text-[10px] text-slate-400 uppercase">Yanlış</p><p className="text-md font-black text-red-400">-{sessionWrongCount}</p></div>
                    <div className={`border p-4 rounded-xl text-left ${darkMode ? 'bg-[#1e293b]/80 border-slate-800' : 'bg-white border-slate-200'}`}><p className="text-[10px] text-slate-400 uppercase">Net Bakiye</p><p className={`text-md font-black ${gainedXpThisSession >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{gainedXpThisSession >= 0 ? `+${gainedXpThisSession}` : gainedXpThisSession} XP</p></div>
                  </div>
                </div>

                <div className="pt-2 flex gap-4 justify-center">
                  <button onClick={startSession} className="bg-[#1e293b] hover:bg-[#334155] text-white font-black px-7 py-3 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"><RotateCcw className="w-4 h-4" /> Yeniden Başlat</button>
                  <button onClick={() => { setGameStarted(false); setGameFinished(false); }} className={`font-bold px-7 py-3 rounded-xl text-xs border ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'}`}>Ana Paneli Kapat</button>
                </div>
              </div>
            ) : (
              /* CANLI OYUN ARENASI */
              <div className="space-y-6">
                
                {/* ⏰ CANLI SÜRE GÖSTERGE BAR BAR (COUNTDOWN) */}
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
                    
                    {/* ÖN YÜZ (SORU KARTI - 🎯 AYDINLIK/GECE UYUMLU AÇIK LACİVERT GÜNCELLEMESİ) */}
                    <div className={`absolute w-full h-full backface-hidden p-8 rounded-3xl border shadow-2xl flex flex-col justify-between items-center transition-all duration-300 bg-[#1e293b] border-slate-700 shadow-slate-400/30`}>
                      <div className="w-full flex justify-between items-center border-b pb-3 border-slate-700/50">
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-md border uppercase bg-slate-900/40 text-cyan-300 border-slate-700">Soru {currentIndex + 1} / {words.length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{gameSetup.source}</span>
                      </div>
                      
                      <div className="text-center space-y-1">
                        <div className="text-4xl font-black text-white tracking-wide drop-shadow-md">{frontText}</div>
                        {words[currentIndex]?.telaffuz && gameSetup.dir === 'en_to_tr' && (
                          <p className="text-xs text-cyan-400 italic font-bold tracking-wide">{words[currentIndex].telaffuz}</p>
                        )}
                      </div>
                      
                      <div className="w-full flex justify-between items-center pt-1">
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 animate-pulse">🔄 Çevirmek İçin Tıkla</span>
                        {gameSetup.dir === 'en_to_tr' && (
                          <button onClick={handleSpeak} title="Kelimeyi Seslendir" className="p-2 rounded-xl border bg-slate-800/60 border-slate-700 text-cyan-400 hover:text-cyan-300 hover:scale-105 transition-all cursor-pointer">
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ARKA YÜZ */}
                    <div className={`absolute w-full h-full backface-hidden p-8 rounded-3xl border-2 shadow-2xl flex flex-col justify-between items-center rotate-y-180 ${darkMode ? 'bg-linear-to-br from-[#1e293b] to-[#131c2e] border-slate-700' : 'bg-linear-to-br from-slate-100 to-white border-slate-300'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">💡 Kelimenin Karşılığı</span>
                      
                      <div className="text-center">
                        <div className="text-3xl font-black text-indigo-500 dark:text-indigo-400 tracking-wide">{backText}</div>
                      </div>

                      <div className={`w-full border p-3 rounded-xl text-center shadow-inner ${darkMode ? 'bg-[#0f172a]/60 border-slate-800/40' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5 tracking-wider">🌐 Cümle İçi Kullanımı (Canlı Sözlük API)</p>
                        <p className={`text-xs font-medium italic leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          "{words[currentIndex]?.ornek_cumle || 'Örnek cümle havuzda aranamadı.'}"
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* FEEDBACK ROW */}
                {feedback && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 font-bold border text-xs shadow-md ${feedback === 'correct' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    {feedback === 'correct' ? <><CheckCircle2 className="w-4 h-4" /> Harika! Doğru veri eşleşmesi sağlandı.</> : <><XCircle className="w-4 h-4" /> Hatalı Seçim! Kelime hata defterinize eklendi.</>}
                  </div>
                )}

                {gameSetup.mode === 'Klasik (Yazarak)' ? (
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <form onSubmit={handleClassicSubmit} className="flex gap-3">
                      <input type="text" disabled={feedback !== null} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Buraya yanıtınızı yazın..." className="flex-1 bg-transparent text-center text-lg font-bold p-3 focus:outline-none disabled:opacity-40" />
                      {!feedback && <button type="submit" className="bg-[#1e293b] text-white px-7 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer hover:bg-slate-800 transition-all">ONAYLA</button>}
                    </form>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {options.map((option, i) => {
                      let btnStyle = darkMode ? "bg-[#1e293b] border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100";
                      if (feedback) {
                        if (option === correctOptionValue) btnStyle = "bg-emerald-600 text-white border-transparent";
                        else if (selectedOption === option && feedback === 'wrong') btnStyle = "bg-red-600 text-white line-through border-transparent";
                        else btnStyle = "opacity-30 cursor-not-allowed";
                      }
                      return (
                        <button key={i} disabled={feedback !== null} onClick={() => handleOptionClick(option)} className={`p-4 rounded-xl border text-sm font-bold flex justify-between items-center transition-all cursor-pointer ${btnStyle}`}>
                          <span>{option}</span><span className="text-[9px] opacity-30 uppercase">Şık {String.fromCharCode(65 + i)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* BOTTOM CONTROL GRID */}
                <div className={`flex justify-between items-center p-4 border rounded-2xl ${darkMode ? 'bg-[#1e293b]/20 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="text-xs font-bold uppercase">Test Skoru: <span className="text-cyan-400 font-black">{score} / {words.length}</span></div>
                  <div className="flex gap-2">
                    {!feedback && <button onClick={handleReveal} className={`text-xs font-bold px-4 py-2 rounded-xl border cursor-pointer ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>Cevabı Gör</button>}
                    {feedback && <button onClick={nextQuestion} className="text-xs font-black bg-[#1e293b] border border-slate-700 text-white px-5 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all">İlerle <ArrowRight className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEKME 2: CANLI SIRALAMA & LİG PANORAMASI */}
        {activeTab === 'lig' && (
          <div className="space-y-6">
            
            {/* 3D ETKİLEŞİMLİ SKOR VE LİG KARTLARI (MOUSE ILE TIKLAYINCA BILGI ACAN ALAN) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KUTU 1: XP SİSTEMİ BİLGİLENDİRME KUTUSU */}
              <div onClick={() => setShowXpInfo(true)} className={`p-5 rounded-2xl border shadow-xl flex items-center justify-between cursor-pointer transform hover:scale-[1.01] transition-all relative overflow-hidden group border-amber-500/20 ${darkMode ? 'bg-linear-to-br from-[#1e293b] to-[#121b2d]' : 'bg-white'}`}>
                <div className="flex items-center gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-xl text-amber-400 group-hover:animate-bounce"><Zap className="w-6 h-6" /></div>
                  <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Dinamik XP Skor Sistemi</p><p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{currentXp} Toplam XP</p></div>
                </div>
                <div className="text-[10px] bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-md font-black uppercase tracking-tighter animate-pulse">Formülü Gör 🔍</div>
              </div>

              {/* KUTU 2: LİG SİSTEMİ BİLGİLENDİRME KUTUSU */}
              <div onClick={() => setShowLeagueInfo(true)} className={`p-5 rounded-2xl border shadow-xl flex items-center justify-between cursor-pointer transform hover:scale-[1.01] transition-all relative overflow-hidden group border-cyan-500/20 ${darkMode ? 'bg-linear-to-br from-[#1e293b] to-[#121b2d]' : 'bg-white'}`}>
                <div className="flex items-center gap-4">
                  <div className="bg-cyan-500/10 p-3 rounded-xl text-cyan-400 text-2xl group-hover:scale-110 duration-200">{leagueBadge}</div>
                  <div className="flex-1 w-full">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Mevcut Akademi Rütben</p>
                    <p className={`text-lg ${leagueColorClass}`}>{leagueName}</p>
                  </div>
                </div>
                <div className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded-md font-black uppercase tracking-tighter">Kriterleri Gör 📊</div>
              </div>
            </div>

            {/* İLERLEME GÖSTERGESİ (PROGRESS BAR) */}
            <div className={`p-6 rounded-3xl border shadow-xl space-y-3 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-slate-400">
                <span>Sonraki Rütbe Aşama İlerlemesi</span>
                <span className={darkMode ? 'text-cyan-400' : 'text-indigo-700'}>%{Math.round(leagueProgressPercent)}</span>
              </div>
              <div className={`w-full h-4 rounded-full overflow-hidden p-0.5 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <div className="h-full bg-linear-to-r from-amber-600 via-slate-400 to-amber-400 rounded-full transition-all duration-1000 shadow-md" style={{ width: `${leagueProgressPercent}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                <span>Mevcut Baraj: {prevLeagueThreshold} XP</span>
                <span>Hedef Sınırı: {nextLeagueThreshold} XP</span>
              </div>
            </div>

            {/* ROZETLER VİTRİNİ */}
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-xs font-black uppercase tracking-wider">🎖️ Kazanılan Akademi Başarı Rozetleriniz</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {achievementsList.map((badge) => {
                  const isUnlocked = unlockedAchievements.includes(badge.id);
                  return (
                    <div key={badge.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center justify-between relative overflow-hidden transition-all duration-300 ${isUnlocked ? `bg-linear-to-br ${badge.color} text-white border-transparent shadow-lg` : darkMode ? 'bg-slate-900/20 border-slate-800 text-slate-600 opacity-30' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-40'}`}>
                      <span className="text-2xl mb-1">{badge.icon}</span>
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider">{badge.title}</h4>
                        <p className="text-[9px] mt-0.5 leading-tight">{badge.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LIVE LEADERBOARD TABLOSU */}
            <div className={`rounded-3xl border shadow-xl overflow-hidden ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <h2 className="text-md font-black">🏆 Canlı Global Sıralama</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Sistemde kayıtlı tüm kullanıcıların anlık veritabanı skor listesi</p>
                </div>
                <div className="text-xs font-bold text-slate-400">Senin Sıran: <span className="text-cyan-400 font-black">#{myRank}</span></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-black text-slate-400 uppercase tracking-wider ${darkMode ? 'bg-[#0f172a]/20 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                      <th className="p-4 text-center w-16">Sıra</th>
                      <th className="p-4">Yazılımcı / Oyuncu</th>
                      <th className="p-4 text-right">Veritabanı Toplam Skoru</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs font-bold ${darkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {liveLeaderboard.map((player) => (
                      <tr key={player.rank} className={`transition-all ${player.id === user.id ? 'bg-indigo-500/10' : darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 text-center">{player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : player.rank}</td>
                        <td className="p-4 flex items-center gap-2">
                          <span className={player.id === user.id ? 'text-indigo-600 dark:text-cyan-400 font-black' : darkMode ? 'text-slate-200' : 'text-slate-700'}>{player.name} {player.id === user.id && '(Siz)'}</span>
                        </td>
                        <td className={`p-4 text-right font-black text-sm ${player.id === user.id ? 'text-cyan-400' : 'text-slate-400'}`}>{player.xp.toLocaleString()} XP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SEKME 3: HATA DEFTERİ */}
        {activeTab === 'hata' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-md font-black">📚 Kelime Defterine Manuel Veri Ekleme</h3>
              <form onSubmit={handleAddCustomWord} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div><label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">İngilizce Kelime</label><input type="text" required value={newWord.ingilizce} onChange={(e) => setNewWord({...newWord, ingilizce: e.target.value})} className={`w-full border p-2.5 rounded-xl text-xs font-semibold focus:outline-none ${darkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="Örn: Refactor" /></div>
                <div><label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Türkçe Karşılığı</label><input type="text" required value={newWord.turkce} onChange={(e) => setNewWord({...newWord, turkce: e.target.value})} className={`w-full border p-2.5 rounded-xl text-xs font-semibold focus:outline-none ${darkMode ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="Örn: Kodu İyileştirmek" /></div>
                <div><label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Seviye</label><select value={newWord.seviye} onChange={(e) => setNewWord({...newWord, seviye: e.target.value})} className={`w-full border p-2.5 rounded-xl text-xs font-bold ${darkMode ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'}`}><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></div>
                <button type="submit" className="bg-[#1e293b] text-white py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-all">SÖZLÜĞE EKLE</button>
              </form>
            </div>
            <div className={`rounded-3xl border shadow-xl overflow-hidden ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="p-6 bg-[#0f172a]/40 border-b dark:border-slate-800 flex justify-between items-center"><h2 className="text-sm font-black">📚 Aktif Zayıf Bellek Hücreleri (Hatalı Kelimeler)</h2><span className="text-xs text-slate-400">Toplam: {hataKelimeleri.length} Kelime</span></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-slate-900/10 text-[10px] text-slate-400 font-black border-b dark:border-slate-800"><th className="p-4">İngilizce</th><th className="p-4">Türkçe</th><th className="p-4">Seviye</th><th className="p-4 text-right">İşlem</th></tr></thead>
                  <tbody>
                    {hataKelimeleri.map((kelime) => (
                      <tr key={kelime.id} className="dark:hover:bg-slate-800/30 text-xs border-b dark:border-slate-800/40">
                        <td className="p-4 font-black">{kelime.ingilizce}</td><td className="p-4 text-slate-400">{kelime.turkce}</td><td className="p-4"><span className="bg-slate-900/40 text-[10px] px-2 py-0.5 rounded border dark:border-slate-800">{kelime.seviye}</span></td>
                        <td className="p-4 text-right"><button onClick={() => handleDeleteWord(kelime.id)} className="text-red-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SEKME 4: AKADEMİ KILAVUZU */}
        {activeTab === 'rehber' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-3xl border shadow-xl ${darkMode ? 'bg-linear-to-br from-[#1e293b] to-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-3"><Compass className="w-6 h-6 text-cyan-400" /><h2 className="text-2xl font-black">📖 Kelime Oyunu</h2></div>
              <p className="text-xs text-slate-400 leading-relaxed">Kelime Oyunu, klasik ezber yöntemlerini geride bırakarak modern öğrenme teorilerini oyunlaştırma mekanikleriyle harmanlar. Bu panel, sistemdeki puanlama, süre kısıtlamaları ve başarı ödüllerinin işleyiş prensipleri hakkında sizi bilgilendirmek amacıyla tasarlanmıştır.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-2xl border shadow-md space-y-4 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 border-b pb-2 dark:border-slate-800"><Zap className="w-5 h-5 text-indigo-400" /><h3 className="text-sm font-black uppercase tracking-wider">⚡ Başarı Puanı (XP) ve Gelişim Algoritması</h3></div>
                <p className="text-xs text-slate-400 leading-relaxed">Doğru cevaplarınız seçtiğiniz zorluk derecesinin katsayısıyla çarpılarak hanenize eklenirken, hatalı yanıtlarınız da rütbenizden düşürülür. Tüm bu süreçler canlı sunucumuz ile anlık senkronize çalışır.</p>
              </div>
              <div className={`p-6 rounded-2xl border shadow-md space-y-4 ${darkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 border-b pb-2 dark:border-slate-800"><Timer className="w-5 h-5 text-cyan-400" /><h3 className="text-sm font-black uppercase tracking-wider">⏰ Zamana Karşı Yarış Parametreleri</h3></div>
                <p className="text-xs text-slate-400 leading-relaxed">Süreli modda 10 saniyelik zaman sınırı bittiğinde sistem soruyu doğrudan "Hatalı" kabul eder. Zaman aşımına uğrayan kelime, daha sonra tekrar edilmek üzere otomatik olarak Hata Defteriniz içerisine şutlanır.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}