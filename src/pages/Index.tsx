
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const Index = () => {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Gift Box Collection</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="overflow-hidden">
            <AspectRatio ratio={4/3}>
              <img 
                src="/images/Малые с бантом/Розовая/Слайд1.JPG" 
                alt="Розовая подарочная коробка малого размера" 
                className="object-cover w-full h-full"
              />
            </AspectRatio>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold">Розовая подарочная коробка (малая)</h2>
              <p className="text-gray-600 mt-2">Проверка отображения изображений</p>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <AspectRatio ratio={4/3}>
              <img 
                src="/images/Средние с бантом/Тиффани/Слайд3.JPG" 
                alt="Тиффани подарочная коробка среднего размера" 
                className="object-cover w-full h-full"
              />
            </AspectRatio>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold">Тиффани подарочная коробка (средняя)</h2>
              <p className="text-gray-600 mt-2">Проверка отображения изображений</p>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <AspectRatio ratio={4/3}>
              <img 
                src="/images/Большие с бантом/Черная/Слайд5.JPG" 
                alt="Черная подарочная коробка большого размера" 
                className="object-cover w-full h-full"
              />
            </AspectRatio>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold">Черная подарочная коробка (большая)</h2>
              <p className="text-gray-600 mt-2">Проверка отображения изображений</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Диагностическая информация</h2>
          <p className="mb-2">Для исправления проблемы с отображением изображений:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Убедитесь, что папка <code>images</code> находится в директории <code>public</code></li>
            <li>Проверьте пути к изображениям в файле данных продуктов</li>
            <li>Проверьте регистр букв в названиях файлов и папок</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Index;
