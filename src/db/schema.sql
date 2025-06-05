-- VERVAPP Web Veritabanı Şeması

-- Kullanıcı Profilleri Tablosu
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) Politikaları
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Kullanıcının kendi profili için okuma izni
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Kullanıcının kendi profili için güncelleme izni
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Website Analizleri Tablosu
CREATE TABLE IF NOT EXISTS website_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  fonts JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout TEXT,
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Website analizleri için RLS
ALTER TABLE website_analyses ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi analizlerini görebilir
CREATE POLICY "Users can view their own website analyses" 
  ON website_analyses FOR SELECT 
  USING (auth.uid() = user_id);

-- Kullanıcı kendi analizlerini ekleyebilir
CREATE POLICY "Users can insert their own website analyses" 
  ON website_analyses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Website Redesign Tablosu
CREATE TABLE IF NOT EXISTS website_redesigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES website_analyses(id) ON DELETE SET NULL,
  design_style TEXT NOT NULL,
  html TEXT,
  css TEXT,
  preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Website redesigns için RLS
ALTER TABLE website_redesigns ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi redesign'larını görebilir
CREATE POLICY "Users can view their own website redesigns" 
  ON website_redesigns FOR SELECT 
  USING (auth.uid() = user_id);

-- Kullanıcı kendi redesign'larını ekleyebilir
CREATE POLICY "Users can insert their own website redesigns" 
  ON website_redesigns FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Trigger - Kullanıcı oluşturulduğunda profil otomatik oluşturulur
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_profile_after_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION create_profile_for_user(); 