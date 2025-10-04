
-- Перемещаем товары Gold и Vanila из средней в большую категорию
UPDATE products 
SET size = 'big'
WHERE artikul IN ('0617', '0618');

-- Перемещаем товары с ручками из большой в малую категорию
UPDATE products 
SET size = 'small'
WHERE artikul IN ('0623', '0624', '0625', '0626', '0627', '062');
