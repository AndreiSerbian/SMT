export default {
  render(productId, container) {
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50 p-8">
        <h1 class="text-3xl font-bold">Товар ${productId}</h1>
        <p class="text-gray-600">Загрузка...</p>
      </div>
    `;
  }
};
