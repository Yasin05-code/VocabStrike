from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
from datetime import datetime
from typing import List
import requests
import os

# Veritabanı ve ORM Araçları
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

current_dir = os.path.dirname(os.path.abspath(__file__) )
# 1. SQLITE VERİTABANI BAĞLANTI YAPILANDIRMASI
DATABASE_URL = f"sqlite:///{os.path.join(current_dir, 'kelime_oyunu.db')}"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. VERİTABANI MODELLERİ
class Kullanici(Base):
    __tablename__ = "kullanicilar"
    id = Column(Integer, primary_key=True, index=True)
    kullanici_adi = Column(String(50), unique=True, index=True, nullable=False)
    isim = Column(String(50), nullable=False)
    soyisim = Column(String(50), nullable=False)
    sifre = Column(String(256), nullable=False)
    xp = Column(Integer, default=0) # 🎯 Veritabanında biriken net canlı XP

class Kelime(Base):
    __tablename__ = "kelimeler"
    id = Column(Integer, primary_key=True, index=True)
    ingilizce = Column(String(100), nullable=False)
    turkce = Column(String(100), nullable=False)
    seviye = Column(String(10), nullable=False)

class HataDefteri(Base):
    __tablename__ = "hata_defteri"
    id = Column(Integer, primary_key=True, index=True)
    kullanici_id = Column(Integer, index=True, nullable=False)
    ingilizce = Column(String(100), nullable=False)
    turkce = Column(String(100), nullable=False)
    seviye = Column(String(10), default="A1")
    eklenme_tarihi = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
import database
database.init_db()

app = FastAPI(title="VocabStrike", version="3.8")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class LoginRequest(BaseModel):
    kullanici_adi: str
    sifre: str

class RegisterRequest(BaseModel):
    kullanici_adi: str
    isim: str
    soyisim: str
    sifre: str

class HataKelimeCreate(BaseModel):
    ingilizce: str
    turkce: str
    seviye: str = "A1"

class HataKelimeResponse(BaseModel):
    id: int
    kullanici_id: int
    ingilizce: str
    turkce: str
    seviye: str
    class Config: from_attributes = True

class XPUpdateRequest(BaseModel):
    kullanici_id: int
    level: str
    dogru_sayisi: int
    yanlis_sayisi: int

@app.get("/api")
def root():
    return {"status": "API online ve tıkır tıkır çalışıyor!"}

@app.post("/api/auth/register")
def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    exists = db.query(Kullanici).filter(Kullanici.kullanici_adi == user_data.kullanici_adi).first()
    if exists: raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten alınmış!")
    hashed_password = hashlib.md5(user_data.sifre.encode()).hexdigest()
    new_user = Kullanici(kullanici_adi=user_data.kullanici_adi, isim=user_data.isim, soyisim=user_data.soyisim, sifre=hashed_password, xp=0)
    db.add(new_user)
    db.commit()
    return {"success": True, "message": "Kayıt başarıyla tamamlandı."}

@app.post("/api/auth/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    hashed_password = hashlib.md5(credentials.sifre.encode()).hexdigest()
    user = db.query(Kullanici).filter(Kullanici.kullanici_adi == credentials.kullanici_adi, Kullanici.sifre == hashed_password).first()
    if not user: raise HTTPException(status_code=400, detail="Kullanıcı adı veya şifre hatalı!")
    return {"success": True, "user": {"id": user.id, "kullanici_adi": user.kullanici_adi, "isim": user.isim, "soyisim": user.soyisim, "xp": user.xp}}


@app.get("/api/words")
def get_system_words(level: str, count: int = 5, db: Session = Depends(get_db)):
    query = db.query(Kelime)
    
    temiz_seviye = level.strip().upper()
    
    if temiz_seviye != "KARIŞIK" and temiz_seviye != "":
        query = query.filter((Kelime.seviye == temiz_seviye) | (Kelime.seviye == level.strip().lower()))
    
    words = query.all()
    
    if not words and temiz_seviye == "C1":
        words = db.query(Kelime).filter(Kelime.seviye.like("%C1%")).all()

    if not words:
        print(f"⚠️ Uyarı: Veritabanında '{level}' seviyesine ait hiçbir kelime bulunamadı!")
        return []
    
    import random
    selected_words = random.sample(words, min(len(words), count))
    
    payload = []
    for w in selected_words:
        ornek_cumle = "Örnek cümle bulunamadı."
        telaffuz = ""
        
        try:
            response = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{w.ingilizce}", timeout=2)
            if response.status_code == 200:
                data = response.json()
                telaffuz = data[0].get("phonetic", "")
                if not telaffuz and data[0].get("phonetics"):
                    telaffuz = data[0]["phonetics"][0].get("text", "")
                
                meanings = data[0].get("meanings", [])
                for meaning in meanings:
                    for definition in meaning.get("definitions", []):
                        if definition.get("example"):
                            ornek_cumle = definition.get("example")
                            break
                    if ornek_cumle != "Örnek cümle bulunamadı.":
                        break
        except Exception as e:
            print(f"Dış API hatası ({w.ingilizce}): {e}")
            
        payload.append({
            "id": w.id,
            "ingilizce": w.ingilizce,
            "turkce": w.turkce,
            "seviye": w.seviye.upper(),
            "telaffuz": telaffuz if telaffuz else "/.../",
            "ornek_cumle": ornek_cumle
        })
        
    return payload

@app.post("/api/user/add-xp")
def add_user_xp(data: XPUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(Kullanici).filter(Kullanici.id == data.kullanici_id).first()
    if not user: raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    
    katsayi = 1.0
    if data.level == "A2": katsayi = 1.2
    elif data.level == "B1": katsayi = 1.5
    elif data.level == "B2": katsayi = 1.8
    elif data.level == "C1": katsayi = 2.0
    elif data.level == "Karışık": katsayi = 1.4

    temel_dogru_xp = 100 * katsayi
    temel_yanlis_xp = -50 * katsayi

    toplam_kazanc = int((data.dogru_sayisi * temel_dogru_xp) + (data.yanlis_sayisi * temel_yanlis_xp))
    
    user.xp += toplam_kazanc
    if user.xp < 0: user.xp = 0
    
    db.commit()
    db.refresh(user)
    return {"success": True, "new_xp": user.xp, "kazanilan_xp": toplam_kazanc}

@app.get("/api/leaderboard")
def get_live_leaderboard(db: Session = Depends(get_db)):
    users = db.query(Kullanici).order_by(Kullanici.xp.desc()).limit(10).all()
    leaderboard = []
    for idx, u in enumerate(users):
        leaderboard.append({"rank": idx + 1, "id": u.id, "name": f"{u.isim} {u.soyisim}", "xp": u.xp})
    return leaderboard

@app.post("/api/hata-defteri", response_model=HataKelimeResponse)
def hata_kelime_ekle(kelime: HataKelimeCreate, kullanici_id: int, db: Session = Depends(get_db)):
    mevcut = db.query(HataDefteri).filter(HataDefteri.kullanici_id == kullanici_id, HataDefteri.ingilizce == kelime.ingilizce.strip()).first()
    if mevcut: return mevcut
    yeni_hata = HataDefteri(kullanici_id=kullanici_id, ingilizce=kelime.ingilizce.strip(), turkce=kelime.turkce.strip(), seviye=kelime.seviye)
    db.add(yeni_hata)
    db.commit()
    db.refresh(yeni_hata)
    return yeni_hata

@app.get("/api/hata-defteri", response_model=List[HataKelimeResponse])
def hata_defteri_listele(kullanici_id: int, db: Session = Depends(get_db)):
    return db.query(HataDefteri).filter(HataDefteri.kullanici_id == kullanici_id).order_by(HataDefteri.id.desc()).all()

@app.get("/api")
def root():
    return {"status": "API online ve tıkır tıkır çalışıyor!"}

@app.delete("/api/hata-defteri/{kelime_id}")
def hata_kelime_sil(kelime_id: int, kullanici_id: int, db: Session = Depends(get_db)):
    kelime = db.query(HataDefteri).filter(HataDefteri.id == kelime_id, HataDefteri.kullanici_id == kullanici_id).first()
    if not kelime: raise HTTPException(status_code=404, detail="Kelime bulunamadı.")
    db.delete(kelime)
    db.commit()
    return {"success": True, "message": "Silindi"}

# 🎯 ==================== BULUT SUNUCU VE CANLI DEPLOY YAPILANDIRMASI ==================== 🎯
if __name__ == "__main__":
    import uvicorn
    
    # Render.com sunucusunun dinamik atadığı portu okuyoruz, lokalde ise varsayılan 8000 portunu açar
    canli_port = int(os.environ.get("PORT", 8000))
    
    # İnternet ortamında çalışması için host '0.0.0.0' olarak kilitlendi
    print(f"🚀 VocabStrike API canlıya uçuyor! Port: {canli_port}")
    uvicorn.run("main:app", host="0.0.0.0", port=canli_port, reload=False)