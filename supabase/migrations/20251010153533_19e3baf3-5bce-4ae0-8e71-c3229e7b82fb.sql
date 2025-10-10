-- Обновляем товары "с бантом" - малая
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE slug = 'bow-box-small')
WHERE (name ILIKE '%с бантом%' OR name ILIKE '%бантом%') 
  AND size = 'small'
  AND category_id IS NULL;

-- Обновляем товары "с бантом" - средняя
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE slug = 'bow-box-medium')
WHERE (name ILIKE '%с бантом%' OR name ILIKE '%бантом%') 
  AND size = 'medium'
  AND category_id IS NULL;

-- Обновляем товары "с бантом" - большая
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE slug = 'bow-box-big')
WHERE (name ILIKE '%с бантом%' OR name ILIKE '%бантом%') 
  AND size = 'big'
  AND category_id IS NULL;

-- Обновляем товары "с ручками" - малая
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE slug = 'handle-box-small')
WHERE (name ILIKE '%с ручками%' OR name ILIKE '%ручками%') 
  AND size = 'small'
  AND category_id IS NULL;