import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Product, Category, Color, productService } from "@/services/productService";
import { Loader2, Plus, Edit, Trash2, Upload, Image, Video } from "lucide-react";

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, colorsData] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
        productService.getColors()
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setColors(colorsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные администратора",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      toast({
        title: "Запуск миграции",
        description: "Начинается процесс миграции товаров...",
      });

      const { data, error } = await supabase.functions.invoke('migrate-products');

      if (error) {
        throw error;
      }

      toast({
        title: "Миграция завершена",
        description: data.message,
      });

      // Reload data after migration
      await loadData();
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Ошибка миграции",
        description: "Произошла ошибка при миграции товаров",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Загрузка панели администратора...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-auto">
      <div className="container mx-auto p-4 min-h-screen">
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Панель администратора</CardTitle>
              <CardDescription>
                Управление товарами, категориями и медиафайлами
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="products">Товары</TabsTrigger>
                <TabsTrigger value="categories">Категории</TabsTrigger>
                <TabsTrigger value="colors">Цвета</TabsTrigger>
                <TabsTrigger value="migration">Миграция</TabsTrigger>
                <TabsTrigger value="analytics">Аналитика</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Товары ({products.length})</h3>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Button>
                </div>

                <div className="grid gap-4">
                  {products.map((product) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                              {product.images && product.images.length > 0 ? (
                                <img 
                                  src={product.images[0].url} 
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Image className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            
                            <div>
                              <h4 className="font-medium">{product.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {product.color?.name} • {product.size_type} • {product.category?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Артикул: {product.artikul} • ID WB: {product.id_wb}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch checked={product.is_active} />
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Image className="h-4 w-4 mr-1" />
                            {product.images?.length || 0} фото
                          </span>
                          <span className="flex items-center">
                            <Video className="h-4 w-4 mr-1" />
                            {product.videos?.length || 0} видео
                          </span>
                          <span>{product.dimensions}</span>
                          <span>{product.weight}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="categories" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Категории ({categories.length})</h3>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить категорию
                  </Button>
                </div>

                <div className="grid gap-4">
                  {categories.map((category) => (
                    <Card key={category.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{category.name}</h4>
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                            <p className="text-xs text-muted-foreground">Slug: {category.slug}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="colors" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Цвета ({colors.length})</h3>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить цвет
                  </Button>
                </div>

                <div className="grid gap-4">
                  {colors.map((color) => (
                    <Card key={color.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div 
                              className="w-8 h-8 rounded-full border-2 border-border"
                              style={{ backgroundColor: color.hex_code }}
                            />
                            <div>
                              <h4 className="font-medium">{color.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {color.hex_code} • Slug: {color.slug}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="migration" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Миграция данных</CardTitle>
                    <CardDescription>
                      Автоматическая миграция товаров из JSON файлов в Supabase
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Что будет мигрировано:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Все товары из products.js</li>
                        <li>• Изображения из public/images/</li>
                        <li>• Видео из public/videos/</li>
                        <li>• Связи между товарами, категориями и цветами</li>
                      </ul>
                    </div>

                    <Button 
                      onClick={runMigration} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Запустить миграцию
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Всего товаров</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{products.length}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Категории</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{categories.length}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Цвета</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{colors.length}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Активные товары</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {products.filter(p => p.is_active).length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}