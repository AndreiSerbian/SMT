import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Product {
  id: string
  artikul: string
  name: string
  size: 'small' | 'medium' | 'big'
  color_hex: string
  price_rub: number
  photos: string[]
  videos?: string[]
  dimensions: {
    length: number
    width: number
    height: number
  }
  weight: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
  is_active: boolean
}

interface GroupedProduct {
  categoryName: string
  categorySlug: string
  products: Product[]
  sizes: {
    small?: Product[]
    medium?: Product[]
    big?: Product[]
  }
  colors: string[]
  priceRange: {
    min: number
    max: number
  }
  mainImage: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting group-products-by-categories function')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Получаем все активные товары
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('Error fetching products:', productsError)
      throw productsError
    }

    // Получаем все активные категории
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      throw categoriesError
    }

    console.log(`Loaded ${products?.length} products and ${categories?.length} categories`)

    // Группируем товары по категориям
    const groupedProducts: GroupedProduct[] = []

    for (const category of categories as Category[]) {
      // Определяем какие товары относятся к этой категории
      let categoryProducts: Product[] = []

      if (category.name.includes('с ручкой')) {
        // Категория "с ручкой" - только малые коробки с ручками
        categoryProducts = (products as Product[]).filter(product => 
          product.name.toLowerCase().includes('ручк') && 
          product.size === 'small'
        )
      } else if (category.name.includes('с лентой')) {
        // Категории "с лентой" - коробки с бантом/лентой определенного размера
        const categorySize = category.name.includes('малая') ? 'small' : 
                           category.name.includes('средняя') ? 'medium' : 'big'
        
        categoryProducts = (products as Product[]).filter(product => 
          (product.name.toLowerCase().includes('бант') || 
           product.name.toLowerCase().includes('лент')) &&
          product.size === categorySize
        )
      }

      if (categoryProducts.length > 0) {
        // Группируем по размерам
        const sizes: { small?: Product[], medium?: Product[], big?: Product[] } = {}
        for (const product of categoryProducts) {
          if (!sizes[product.size]) {
            sizes[product.size] = []
          }
          sizes[product.size]!.push(product)
        }

        // Получаем уникальные цвета
        const colors = [...new Set(categoryProducts.map(p => p.color_hex))]

        // Находим диапазон цен
        const prices = categoryProducts.map(p => p.price_rub)
        const priceRange = {
          min: Math.min(...prices),
          max: Math.max(...prices)
        }

        // Берем первое фото как главное изображение
        const mainImage = categoryProducts[0]?.photos?.[0] || ''

        groupedProducts.push({
          categoryName: category.name,
          categorySlug: category.slug,
          products: categoryProducts,
          sizes,
          colors,
          priceRange,
          mainImage
        })
      }
    }

    console.log(`Grouped products into ${groupedProducts.length} categories`)

    return new Response(
      JSON.stringify({
        success: true,
        data: groupedProducts,
        meta: {
          totalCategories: categories?.length,
          totalProducts: products?.length,
          groupedCategories: groupedProducts.length
        }
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in group-products-by-categories:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})