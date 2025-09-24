// Скрипт для импорта товаров из products.js в Supabase
// Запустите этот код в консоли браузера на странице админ панели

async function importProducts() {
  try {
    // Загружаем данные товаров
    const response = await fetch('/import-products.json');
    const products = await response.json();
    
    // Вызываем Edge Function для импорта
    const importResponse = await fetch('https://bsndismiessofvhglzrv.supabase.co/functions/v1/import-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY`
      },
      body: JSON.stringify({
        products: products,
        admin_login: 'admin',
        admin_password: 'admin123' // Замените на реальный пароль админа
      })
    });
    
    const result = await importResponse.json();
    
    if (result.success) {
      console.log(`✅ Успешно импортировано ${result.imported} товаров`);
      if (result.errors > 0) {
        console.warn(`⚠️  Ошибки при импорте: ${result.errors}`);
      }
    } else {
      console.error('❌ Ошибка импорта:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    throw error;
  }
}

// Запустить импорт
importProducts();