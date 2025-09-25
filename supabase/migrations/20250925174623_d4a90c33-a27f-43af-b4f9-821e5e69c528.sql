-- Update categories to match the new structure
-- Delete old categories first
DELETE FROM categories;

-- Insert new categories with proper structure
INSERT INTO categories (name, slug, sort_order, is_active) VALUES
('Подарочная коробка с ручкой - малая', 'handle-box-small', 1, true),
('Подарочная коробка с лентой - малая', 'bow-box-small', 2, true),
('Подарочная коробка с лентой - средняя', 'bow-box-medium', 3, true),
('Подарочная коробка с лентой - большая', 'bow-box-big', 4, true);

-- Add comment to clarify the categories structure
COMMENT ON TABLE categories IS 'Product categories with gift box types and sizes';