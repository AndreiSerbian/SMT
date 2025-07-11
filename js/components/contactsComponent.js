
import { sendContactRequest } from '../services/contact-service.js';

const ContactsComponent = {
  render(container) {
    if (!container) {
      console.error('Container not provided to ContactsComponent');
      return;
    }
    
    container.innerHTML = `
      <nav class="bg-white shadow-md">
        <div class="container mx-auto px-6 py-3 flex justify-between items-center">
          <a href="#" class="text-xl font-bold text-gray-800">
            <span class="hidden sm:inline">SMT Premium Box</span>
            <span class="sm:hidden">SMT Premium Box</span>
          </a>
          
          <!-- Навигационное меню (одинаковое для всех устройств) -->
          <div class="flex space-x-4">
            <a href="#" class="text-gray-600 hover:text-gray-800">Главная</a>
            <a href="#contacts" class="text-gray-600 hover:text-gray-800">Контакты</a>
          </div>
        </div>
      </nav>

      <div class="container mx-auto">
        <section class="max-w-3xl mx-auto p-6">
          <h2 class="text-3xl font-bold mb-6">Контакты</h2>
          <p class="mb-4">Свяжитесь с нами удобным способом или закажите обратный звонок:</p>

          <form id="contact-form" class="space-y-4">
            <input type="text" name="name" placeholder="Ваше имя" required class="w-full border rounded p-2"/>
            <input type="tel" name="phone" placeholder="+7 ..." required class="w-full border rounded p-2"/>
            <textarea name="message" rows="4" placeholder="Сообщение" class="w-full border rounded p-2"></textarea>

            <button type="submit" class="w-1/2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
              Отправить
            </button>
          </form>

          <ul class="mt-6 space-y-2 text-sm">
            <li>Телефон: <a href="tel:+79153474616" class="text-blue-500">+7 (915) 347-46-16</a></li>
            <li>WhatsApp: <a href="https://wa.me/79153474616" class="text-blue-500">Написать в WhatsApp</a></li>
            <li>Email: <a href="mailto:smtpremiumbox@serbiyan.ru" class="text-blue-500">smtpremiumbox@serbiyan.ru</a></li>
          </ul>
        </section>
      </div>

      <footer class="bg-blue-950 text-white py-8 mt-12">
        <div class="container mx-auto px-6">
          <div class="flex flex-col md:flex-row justify-between">
            <div class="mb-6 md:mb-0">
              <h3 class="text-xl font-bold mb-4">SMT Premium Box</h3>
              <p class="text-gray-400">Красивые подарочные коробки оптом</p>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-3">Контакты</h4>
              <p class="text-white-400">Телефон: +79153474616</p>
              <p class="text-white-400">Email: smtpremiumbox@serbiyan.ru</p>
            </div>
          </div>
          <div class="border-t border-gray-700 mt-8 pt-6 text-center text-white-400">
            <p>&copy; 2025 SMT Premium Box. Все права защищены.</p>
          </div>
        </div>
      </footer>
    `;

    // Добавляем обработчик формы с защитой от дублирования
    const contactForm = container.querySelector('#contact-form');
    if (contactForm && !contactForm.dataset.listenerAttached) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Блокируем кнопку отправки для предотвращения множественных отправок
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Отправляется...';
        
        const formData = new FormData(contactForm);
        const data = {
          name: formData.get('name'),
          phone: formData.get('phone'),
          message: formData.get('message') || '',
          created_at: new Date().toISOString()
        };

        try {
          console.log('Отправка контактного запроса:', data);
          await sendContactRequest(data);
          
          // Показываем уведомление об успехе
          alert('Спасибо! Мы свяжемся с вами в ближайшее время.');
          
          // Очищаем форму
          contactForm.reset();
        } catch (error) {
          console.error('Ошибка при отправке:', error);
          alert('Произошла ошибка при отправке. Попробуйте еще раз.');
        } finally {
          // Восстанавливаем кнопку
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
      });
      
      // Помечаем, что обработчик уже добавлен
      contactForm.dataset.listenerAttached = 'true';
    }
  }
};

export default ContactsComponent;
