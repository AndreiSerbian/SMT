import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Gift, Package, Boxes, Users, Sparkles, Shield, Truck, Wrench } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
const Index = () => {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto">
        {/* Hero-блок */}
        <section className="bg-white py-12 px-4 text-center rounded-xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">SMT Premium Box</h1>
          <p className="text-lg md:text-xl text-gray-600 mb-6">Оптовые продажи подарочных упаковок</p>
          <a href="#catalog" className="inline-block bg-blue-900 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition">
            Перейти в каталог коробок
          </a>
        </section>

        {/* Section: Что мы продаём */}
        <section className="bg-white py-16 px-4" id="about-boxes">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Что мы продаём
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* 1. Самосборные коробки */}
              <article className="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition">
                <div className="flex items-start gap-4">
                  <Package className="h-10 w-10 text-primary shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Самосборные подарочные коробки</h3>
                    <p className="text-gray-600 mt-1">Продаём самосборные подарочные упаковки: на магнитах и на лентах. Удобная конструкция — без клея и лишних инструментов.</p>
                  </div>
                </div>
              </article>

              {/* 2. Для любого повода */}
              <article className="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition">
                <div className="flex items-start gap-4">
                  <Sparkles className="h-10 w-10 text-primary shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Для любого праздника</h3>
                    <p className="text-gray-600 mt-1">Сэкономят ваше время на подготовку к 8 Марта, Дню рождения, Новому году, 14 февраля и любому другому событию.</p>
                  </div>
                </div>
              </article>

              {/* 3. Широкий выбор */}
              <article className="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition">
                <div className="flex items-start gap-4">
                  <Boxes className="h-10 w-10 text-primary shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Широкий выбор</h3>
                    <p className="text-gray-600 mt-1">У нас вы найдёте коробки для косметики, сладостей, одежды, аксессуаров, техники и многого другого.</p>
                  </div>
                </div>
              </article>

              {/* 4. Для родных и близких */}
              <article className="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition">
                <div className="flex items-start gap-4">
                  <Users className="h-10 w-10 text-primary shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Для родных и близких</h3>
                    <p className="text-gray-600 mt-1">Коробки на магнитах помогают быстро и красиво оформить подарки коллегам, родным, детям и родителям.</p>
                  </div>
                </div>
              </article>

              {/* 5. Делает подарок эффектнее */}
              <article className="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition md:col-span-2 lg:col-span-1">
                <div className="flex items-start gap-4">
                  <Gift className="h-10 w-10 text-primary shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Делает подарок эффектнее</h3>
                    <p className="text-gray-600 mt-1">Элегантный дизайн впечатляет не только именинника, но и всех вокруг — подарок выглядит премиально и запоминается.</p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Блок с преимуществами */}
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">Наши преимущества</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Преимущество 1 */}
              <div className="bg-white rounded-xl shadow p-6 flex items-start gap-4">
                <Package className="h-10 w-10 text-primary shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Удобная упаковка</h3>
                  <p className="text-gray-600">Все коробки самосборные и поставляются в разобранном виде. Это экономит место при транспортировке и хранении.</p>
                </div>
              </div>

              {/* Преимущество 2 */}
              <div className="bg-white rounded-xl shadow p-6 flex items-start gap-4">
                <Wrench className="h-10 w-10 text-primary shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Удобная сборка</h3>
                  <p className="text-gray-600">Коробка легко собирается и держится на магнитах и уголках. Бант украшает и скрепляет конструкцию.</p>
                </div>
              </div>

              {/* Преимущество 3 */}
              <div className="bg-white rounded-xl shadow p-6 flex items-start gap-4">
                <Boxes className="h-10 w-10 text-primary shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Разные размеры и цвета</h3>
                  <p className="text-gray-600">У нас большой выбор коробок: косметика, одежда, техника, сладости и многое другое. Формы и расцветки на любой вкус.</p>
                </div>
              </div>

              {/* Преимущество 4 */}
              <div className="bg-white rounded-xl shadow p-6 flex items-start gap-4">
                <Shield className="h-10 w-10 text-primary shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Высокое качество</h3>
                  <p className="text-gray-600">Коробки из картона плотностью 1200 г/м². Толщина стенок — 2 мм. На ряде премиум коробок используется anti-scratch пленка обеспечивая её прочность.</p>
                </div>
              </div>

              {/* Преимущество 5 */}
              <div className="bg-white rounded-xl shadow p-6 flex items-start gap-4">
                <Truck className="h-10 w-10 text-primary shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Забота о доставке</h3>
                  <p className="text-gray-600">Тщательная упаковка каждого заказа. Мы заботимся, чтобы коробка дошла до вас в идеальном виде.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Admin Button */}
        <AdminButton />
      </div>
    </div>
  );
};

export default Index;
