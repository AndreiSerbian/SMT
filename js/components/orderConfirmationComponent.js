/**
 * Компонент страницы подтверждения заказа
 */
class OrderConfirmationComponent {
  render(container) {
    // Получаем параметры из URL
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const orderId = urlParams.get('order_id');
    const status = urlParams.get('status');

    // Определяем контент в зависимости от статуса
    const isSuccess = status === 'confirmed';
    const isAlreadyConfirmed = status === 'already_confirmed';
    const isError = status === 'error';

    let iconHtml = '';
    let titleText = '';
    let messageText = '';
    let statusClass = '';

    if (isSuccess) {
      iconHtml = `
        <svg class="confirmation-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <path d="M9 12l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      titleText = 'Заказ успешно подтвержден!';
      messageText = `Ваш заказ подтвержден и принят в обработку. Мы свяжемся с вами в ближайшее время для уточнения деталей доставки.`;
      statusClass = 'success';
    } else if (isAlreadyConfirmed) {
      iconHtml = `
        <svg class="confirmation-icon info" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      titleText = 'Заказ уже подтвержден';
      messageText = `Этот заказ был подтвержден ранее. Если у вас есть вопросы, пожалуйста, свяжитесь с нами.`;
      statusClass = 'info';
    } else if (isError) {
      iconHtml = `
        <svg class="confirmation-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <path d="M15 9l-6 6M9 9l6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      titleText = 'Ошибка подтверждения';
      messageText = 'К сожалению, произошла ошибка при подтверждении заказа. Пожалуйста, свяжитесь с нами для решения вопроса.';
      statusClass = 'error';
    } else {
      iconHtml = `
        <svg class="confirmation-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      titleText = 'Неверная ссылка';
      messageText = 'Ссылка для подтверждения заказа недействительна или устарела.';
      statusClass = 'error';
    }

    container.innerHTML = `
      <div class="order-confirmation-page">
        <div class="confirmation-container ${statusClass}">
          <div class="confirmation-content">
            ${iconHtml}
            <h1 class="confirmation-title">${titleText}</h1>
            <p class="confirmation-message">${messageText}</p>
            ${orderId ? `<p class="order-id">ID заказа: <strong>${orderId}</strong></p>` : ''}
            <div class="confirmation-actions">
              <a href="#" class="btn-home">Вернуться на главную</a>
              <a href="#contacts" class="btn-contact">Связаться с нами</a>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .order-confirmation-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .confirmation-container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 100%;
          padding: 60px 40px;
          text-align: center;
          animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .confirmation-icon {
          width: 100px;
          height: 100px;
          margin: 0 auto 30px;
          animation: scaleIn 0.6s ease-out 0.2s both;
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .confirmation-icon.success {
          color: #10b981;
        }
        
        .confirmation-icon.info {
          color: #3b82f6;
        }
        
        .confirmation-icon.error {
          color: #ef4444;
        }
        
        .confirmation-title {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 20px;
          animation: fadeIn 0.6s ease-out 0.3s both;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .confirmation-message {
          font-size: 18px;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 30px;
          animation: fadeIn 0.6s ease-out 0.4s both;
        }
        
        .order-id {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 40px;
          padding: 15px;
          background: #f3f4f6;
          border-radius: 10px;
          animation: fadeIn 0.6s ease-out 0.5s both;
        }
        
        .order-id strong {
          color: #1f2937;
          font-weight: 600;
        }
        
        .confirmation-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
          animation: fadeIn 0.6s ease-out 0.6s both;
        }
        
        .btn-home,
        .btn-contact {
          display: inline-block;
          padding: 14px 30px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .btn-home {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-home:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        .btn-contact {
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
        }
        
        .btn-contact:hover {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
        }
        
        @media (max-width: 640px) {
          .confirmation-container {
            padding: 40px 20px;
          }
          
          .confirmation-title {
            font-size: 24px;
          }
          
          .confirmation-message {
            font-size: 16px;
          }
          
          .confirmation-icon {
            width: 80px;
            height: 80px;
          }
          
          .confirmation-actions {
            flex-direction: column;
          }
          
          .btn-home,
          .btn-contact {
            width: 100%;
          }
        }
      </style>
    `;
  }

  destroy(container) {
    if (container) {
      container.innerHTML = '';
    }
  }
}

export default OrderConfirmationComponent;
