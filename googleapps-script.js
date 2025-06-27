
// Этот код нужно скопировать и вставить в новый Google Apps Script проект
// Затем опубликовать его как веб-приложение, доступное для всех 
// и заменить URL в функциях updateGoogleSheets в Edge Functions

/**
 * Обработчик веб-запросов к Google Apps Script
 */
function doPost(e) {
  try {
    // Парсим данные из запроса
    const data = JSON.parse(e.postData.contents);
    const { sheetId, action, orderData } = data;
    
    let result;
    
    if (action === 'addOrUpdateOrder') {
      result = addOrUpdateOrder(sheetId, orderData);
    } else {
      result = { error: 'Неизвестное действие' };
    }
    
    // Возвращаем результат в формате JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Обработка ошибок
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Добавляет или обновляет заказ в Google Sheets
 */
function addOrUpdateOrder(sheetId, orderData) {
  // Открываем таблицу по ID
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  
  // Получаем или создаем лист "Заказы"
  let sheet = spreadsheet.getSheetByName('Заказы');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Заказы');
    
    // Устанавливаем заголовки для колонок
    const headers = [
      'ID заказа', 
      'Имя клиента', 
      'Телефон', 
      'Email', 
      'Адрес', 
      'Способ оплаты', 
      'Доставка', 
      'Товары', 
      'Подытог', 
      'Скидка', 
      'Итого', 
      'Статус', 
      'Дата создания', 
      'Дата подтверждения'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  
  // Ищем заказ с таким же ID, если он уже существует
  const orderId = orderData[0]; // Первый элемент массива - ID заказа
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  let rowIndex = -1;
  
  // Ищем строку с нужным ID заказа
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === orderId) {
      rowIndex = i + 1; // +1 потому что индексация в Sheets начинается с 1
      break;
    }
  }
  
  if (rowIndex > 0) {
    // Обновляем существующую строку
    sheet.getRange(rowIndex, 1, 1, orderData.length).setValues([orderData]);
    return { success: true, message: 'Заказ обновлен', rowIndex: rowIndex };
  } else {
    // Добавляем новую строку
    sheet.appendRow(orderData);
    return { success: true, message: 'Заказ добавлен', rowIndex: sheet.getLastRow() };
  }
}

/**
 * Простой GET запрос для проверки работы скрипта
 */
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status: 'Google Apps Script работает!' }))
    .setMimeType(ContentService.MimeType.JSON);
}
