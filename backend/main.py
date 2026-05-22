from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
from datetime import datetime
from typing import List
import requests  # 🌐 Dış API istekleri için eklendi

# Veritabanı ve ORM Araçları
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# 1. VERİTABANI BAĞLANTI YAPILANDIRMASI
DATABASE_URL = "mysql+mysqlconnector://root:Yasin05kaya.@127.0.0.1/kelime_oyunu"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. VERİTABANI MODELLERİ (TABLOLAR)
class Kullanici(Base):
    __tablename__ = "kullanicilar"
    id = Column(Integer, primary_key=True, index=True)
    kullanici_adi = Column(String(50), unique=True, index=True, nullable=False)
    isim = Column(String(50), nullable=False)
    soyisim = Column(String(50), nullable=False)
    sifre = Column(String(256), nullable=False)

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

# Tabloları MySQL'de otomatik oluştur/güncelle
Base.metadata.create_all(bind=engine)

# 3. FASTAPI VE GENİŞLETİLMİŞ CORS GÜVENLİK AYARI
app = FastAPI(title="Kelime Master Pro API", version="2.5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme aşamasında tarayıcı engellerini tamamen aşmak için tam serbest mod
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 4. PYDANTIC MODEL ŞEMALARI
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

    class Config:
        from_attributes = True

# 5. ENDPOINT'LER
@app.get("/api")
def root():
    return {"status": "API online ve tıkır tıkır çalışıyor!"}

@app.post("/api/auth/register")
def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    exists = db.query(Kullanici).filter(Kullanici.kullanici_adi == user_data.kullanici_adi).first()
    if exists:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten alınmış!")
    
    hashed_password = hashlib.md5(user_data.sifre.encode()).hexdigest()
    new_user = Kullanici(
        kullanici_adi=user_data.kullanici_adi,
        isim=user_data.isim,
        soyisim=user_data.soyisim,
        sifre=hashed_password
    )
    db.add(new_user)
    db.commit()
    return {"success": True, "message": "Kayıt başarıyla tamamlandı."}

@app.post("/api/auth/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    hashed_password = hashlib.md5(credentials.sifre.encode()).hexdigest()
    user = db.query(Kullanici).filter(
        Kullanici.kullanici_adi == credentials.kullanici_adi,
        Kullanici.sifre == hashed_password
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Kullanıcı adı veya şifre hatalı!")
    
    return {
        "success": True,
        "user": {"id": user.id, "kullanici_adi": user.kullanici_adi, "isim": user.isim, "soyisim": user.soyisim}
    }

# 🚀 DIŞ API DESTEKLİ GÜNCELLENMİŞ KELİME GETİRME ENDPOINT'İ
@app.get("/api/words")
def get_system_words(level: str, count: int = 5, db: Session = Depends(get_db)):
    query = db.query(Kelime)
    if level != "Karışık" and level != "":
        query = query.filter(Kelime.seviye == level)
    
    words = query.all()
    if not words:
        return []
    
    import random
    selected_words = random.sample(words, min(len(words), count))
    
    payload = []
    for w in selected_words:
        ornek_cumle = "Örnek cümle bulunamadı."
        telaffuz = ""
        
        # 🌐 Dış Sözlük API'sine anlık tünel açılıyor
        try:
            response = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{w.ingilizce}", timeout=2)
            if response.status_code == 200:
                data = response.json()
                
                # Fonetik okunuşu (telaffuz simgesini) çek
                telaffuz = data[0].get("phonetic", "")
                if not telaffuz and data[0].get("phonetics"):
                    telaffuz = data[0]["phonetics"][0].get("text", "")
                
                # İlk bulduğun İngilizce örnek cümleyi çek
                meanings = data[0].get("meanings", [])
                for meaning in meanings:
                    for definition in meaning.get("definitions", []):
                        if definition.get("example"):
                            ornek_cumle = definition.get("example")
                            break
                    if ornek_cumle != "Örnek cümle bulunamadı.":
                        break
        except Exception as e:
            # Dış API servis kesintisi durumunda oyun akışının kopmaması için hata maskeleniyor
            print(f"Dış API tünel hatası ({w.ingilizce}): {e}")
            
        payload.append({
            "id": w.id,
            "ingilizce": w.ingilizce,
            "turkce": w.turkce,
            "seviye": w.seviye,
            "telaffuz": telaffuz if telaffuz else "/.../",
            "ornek_cumle": ornek_cumle
        })
        
    return payload

@app.post("/api/hata-defteri", response_model=HataKelimeResponse)
def hata_kelime_ekle(kelime: HataKelimeCreate, kullanici_id: int, db: Session = Depends(get_db)):
    mevcut = db.query(HataDefteri).filter(
        HataDefteri.kullanici_id == kullanici_id,
        HataDefteri.ingilizce == kelime.ingilizce.strip()
    ).first()
    
    if mevcut:
        return mevcut

    yeni_hata = HataDefteri(
        kullanici_id=kullanici_id,
        ingilizce=kelime.ingilizce.strip(),
        turkce=kelime.turkce.strip(),
        seviye=kelime.seviye
    )
    db.add(yeni_hata)
    db.commit()
    db.refresh(yeni_hata)
    return yeni_hata

@app.get("/api/hata-defteri", response_model=List[HataKelimeResponse])
def hata_defteri_listele(kullanici_id: int, db: Session = Depends(get_db)):
    return db.query(HataDefteri).filter(HataDefteri.kullanici_id == kullanici_id).order_by(HataDefteri.id.desc()).all()

@app.delete("/api/hata-defteri/{kelime_id}")
def hata_kelime_sil(kelime_id: int, kullanici_id: int, db: Session = Depends(get_db)):
    kelime = db.query(HataDefteri).filter(HataDefteri.id == kelime_id, HataDefteri.kullanici_id == kullanici_id).first()
    if not kelime:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı.")
    db.delete(kelime)
    db.commit()
    return {"success": True, "message": "Silindi"}