-- Clean up duplicated colors in the colors table
-- Keep only English names in 'name' field and Russian names in 'russian_name' field

-- First, let's delete the duplicated entries that have Russian names in the 'name' field
-- We'll keep the ones with proper English names and russian_name filled

-- Delete Russian-named entries that have English equivalents
DELETE FROM colors 
WHERE name IN (
  'Белая', 'Белый бриллиант', 'Ванильная', 'Голубой лед', 'Золото', 
  'Красная', 'Лавандовая', 'Оранжевая', 'Персиковая', 'Розовая', 
  'Серебряная', 'Сиреневая', 'Синий бархат', 'Тиффани', 'Черная', 'Черный муар'
);

-- Update any remaining entries to ensure consistency
-- Make sure all entries have both English and Russian names properly set
UPDATE colors 
SET 
  name = CASE 
    WHEN name = 'Rose' THEN 'Rose'
    WHEN name = 'Tiffany' THEN 'Tiffany' 
    WHEN name = 'Black' THEN 'Black'
    WHEN name = 'White' THEN 'White'
    WHEN name = 'Red' THEN 'Red'
    WHEN name = 'Orange' THEN 'Orange'
    WHEN name = 'Gold' THEN 'Gold'
    WHEN name = 'Ice Blue' THEN 'Ice Blue'
    WHEN name = 'Vanilla' THEN 'Vanilla'
    WHEN name = 'Blue Velvet' THEN 'Blue Velvet'
    WHEN name = 'Lavender' THEN 'Lavender'
    WHEN name = 'Peach' THEN 'Peach'
    WHEN name = 'Black Moire' THEN 'Black Moire'
    WHEN name = 'White Diamond' THEN 'White Diamond'
    WHEN name = 'Silver' THEN 'Silver'
    WHEN name = 'Lilac' THEN 'Lilac'
    ELSE name
  END,
  russian_name = CASE 
    WHEN name = 'Rose' THEN 'Розовая'
    WHEN name = 'Tiffany' THEN 'Тиффани'
    WHEN name = 'Black' THEN 'Черная'
    WHEN name = 'White' THEN 'Белая'
    WHEN name = 'Red' THEN 'Красная'
    WHEN name = 'Orange' THEN 'Оранжевая'
    WHEN name = 'Gold' THEN 'Золотая'
    WHEN name = 'Ice Blue' THEN 'Голубой лед'
    WHEN name = 'Vanilla' THEN 'Ванильная'
    WHEN name = 'Blue Velvet' THEN 'Синий бархат'
    WHEN name = 'Lavender' THEN 'Лавандовая'
    WHEN name = 'Peach' THEN 'Персиковая'
    WHEN name = 'Black Moire' THEN 'Черный муар'
    WHEN name = 'White Diamond' THEN 'Белый бриллиант'
    WHEN name = 'Silver' THEN 'Серебряная'
    WHEN name = 'Lilac' THEN 'Сиреневая'
    ELSE russian_name
  END
WHERE russian_name IS NOT NULL;

-- Add unique constraint to prevent future duplicates based on hex_code
ALTER TABLE colors ADD CONSTRAINT unique_color_hex UNIQUE (hex_code);

-- Add comment to clarify the table structure
COMMENT ON TABLE colors IS 'Color definitions with English names for admin and Russian names for customers';
COMMENT ON COLUMN colors.name IS 'English color name used in admin panel and internal systems';
COMMENT ON COLUMN colors.russian_name IS 'Russian color name displayed to customers';