import React, { useState } from 'react';
import axios from 'axios'; // axios bağımlılığını doğrudan burada kullanıyoruz

// 🎯 CANLI BACKEND ADRESİNİZ
const API_BASE_URL = "https://vocabstrike-backend.onrender.com";

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ kullanici_adi: '', isim: '', soyisim: '', sifre: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    // Basit doğrulama kontrolleri
    if (!formData.kullanici_adi || !formData.sifre) {
      setError('Lütfen gerekli alanları doldurun.');
      return;
    }
    if (!isLogin && (!formData.isim || !formData.soyisim)) {
      setError('Lütfen isim ve soyisim alanlarını doldurun.');
      return;
    }

    try {
      setLoading(true);
      if (isLogin) {
        // 🔒 CANLI GİRİŞ YAPMA İSTEĞİ (INLINE API)
        const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          kullanici_adi: formData.kullanici_adi,
          sifre: formData.sifre
        });
        if (res.data.success) {
          onLoginSuccess(res.data.user);
        }
      } else {
        // 📝 CANLI KAYIT OLMA İSTEĞİ (INLINE API)
        const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
          kullanici_adi: formData.kullanici_adi,
          isim: formData.isim,
          soyisim: formData.soyisim,
          sifre: formData.sifre
        });
        if (res.data.success) {
          alert('Kayıt başarıyla tamamlandı! Şimdi giriş yapabilirsiniz.');
          setIsLogin(true);
          setFormData({ kullanici_adi: '', isim: '', soyisim: '', sifre: '' });
        }
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Bağlantı sorunu! Lütfen sunucunuzu kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-black text-indigo-600 tracking-tight">VocabStrike</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">Dil Gelişim Arenası</p>
        </div>

        <div className="flex border-b text-sm font-bold">
          <button onClick={() => { setIsLogin(true); setError(''); }} className={`flex-1 pb-3 text-center transition-all ${isLogin ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>🔒 Giriş Yap</button>
          <button onClick={() => { setIsLogin(false); setError(''); }} className={`flex-1 pb-3 text-center transition-all ${!isLogin ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>📝 Kayıt Ol</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <input type="text" required value={formData.isim} onChange={(e) => setFormData({...formData, isim: e.target.value})} placeholder="Adınız" className="w-full border border-slate-200 p-3 rounded-xl text-xs font-semibold bg-slate-50 focus:outline-none focus:border-indigo-500" />
              <input type="text" required value={formData.soyisim} onChange={(e) => setFormData({...formData, soyisim: e.target.value})} placeholder="Soyadınız" className="w-full border border-slate-200 p-3 rounded-xl text-xs font-semibold bg-slate-50 focus:outline-none focus:border-indigo-500" />
            </div>
          )}

          <input type="text" required value={formData.kullanici_adi} onChange={(e) => setFormData({...formData, kullanici_adi: e.target.value})} placeholder="Kullanıcı Adı" className="w-full border border-slate-200 p-3 rounded-xl text-xs font-semibold bg-slate-50 focus:outline-none focus:border-indigo-500" />
          <input type="password" required value={formData.sifre} onChange={(e) => setFormData({...formData, sifre: e.target.value})} placeholder="Şifre" className="w-full border border-slate-200 p-3 rounded-xl text-xs font-semibold bg-slate-50 focus:outline-none focus:border-indigo-500" />

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg transition-all transform active:scale-95 disabled:opacity-50">
            {loading ? 'İşlem yapılıyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>
      </div>
    </div>
  );
}