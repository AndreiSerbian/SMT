
-- Создание таблицы для сохранения контактных запросов
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Политика для публичной вставки (любой может отправить обращение)
CREATE POLICY "Anyone can insert contact requests" 
ON contact_requests 
FOR INSERT 
WITH CHECK (true);

-- Без политики для SELECT - только через прямое обращение к базе или админ-панель Supabase
-- можно будет просматривать обращения
