import React, { useState } from 'react';
import { login, register } from '../api';
import { Lock, User } from 'lucide-react';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ kullanici_adi: '', isim: '', soyisim: '', sifre: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const res = await login({ kullanici_adi: formData.kullanici_adi, sifre: formData.sifre });
        if (res.data.success) {
          onLoginSuccess(res.data.user);
        }
      } else {
        const res = await register(formData);
        if (res.data.success) {
          setSuccess('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Bağlantı sorunu! Lütfen sunucunuzu kontrol edin.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4" style={{ fontFamily: 'sans-serif' }}>
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full">
        <h2 className="text-3xl font-extrabold text-center mb-6 text-indigo-600">⚡ KELİME MASTER PRO</h2>
        
        <div className="flex border-b border-slate-200 mb-6">
          <button type="button" className={`w-1/2 pb-3 font-semibold text-sm ${isLogin ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`} onClick={() => setIsLogin(true)}>🔒 Giriş Yap</button>
          <button type="button" className={`w-1/2 pb-3 font-semibold text-sm ${!isLogin ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`} onClick={() => setIsLogin(false)}>📝 Kayıt Ol</button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-200">⚠️ {error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm mb-4 border border-green-200">✅ {success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="İsim" required className="border border-slate-300 p-3 rounded-xl text-sm w-full focus:outline-none focus:border-indigo-600" onChange={(e) => setFormData({...formData, isim: e.target.value})} />
              <input type="text" placeholder="Soyisim" required className="border border-slate-300 p-3 rounded-xl text-sm w-full focus:outline-none focus:border-indigo-600" onChange={(e) => setFormData({...formData, soyisim: e.target.value})} />
            </div>
          )}
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Kullanıcı Adı" required className="border border-slate-300 pl-10 pr-3 p-3 rounded-xl text-sm w-full focus:outline-none focus:border-indigo-600" onChange={(e) => setFormData({...formData, kullanici_adi: e.target.value})} />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
            <input type="password" placeholder="Şifre" required className="border border-slate-300 pl-10 pr-3 p-3 rounded-xl text-sm w-full focus:outline-none focus:border-indigo-600" onChange={(e) => setFormData({...formData, sifre: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:opacity-90 transition-all">
            {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
          </button>
        </form>
      </div>
    </div>
  );
}