// Импорт товаров в Supabase
const products = [
    {
      "name": "Подарочная коробка с лентой",
      "id": "059",
      "artikul": "059",
      "idWB": "215908492",
      "color": "Розовая",
      "sizeType": "малая",
      "dimensions": { "length": 23, "width": 17, "height": 7 },
      "weight": 0.195,
      "photo": [
        "images/small with bow/pink/slide1.webp",
        "images/small with bow/pink/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0591",
      "artikul": "0591",
      "idWB": "215915227",
      "color": "Тиффани",
      "sizeType": "малая",
      "dimensions": { "length": 23, "width": 17, "height": 7 },
      "weight": 0.195,
      "photo": [
        "images/small with bow/tiffany/slide1.webp",
        "images/small with bow/tiffany/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0592",
      "artikul": "0592",
      "idWB": "215916129",
      "color": "Черная",
      "sizeType": "малая",
      "dimensions": { "length": 23, "width": 17, "height": 7 },
      "weight": 0.195,
      "photo": [
        "images/small with bow/black/slide1.webp",
        "images/small with bow/black/slide2.webp",
        "images/small with bow/black/slide3.webp",
        "images/small with bow/black/slide4.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0593",
      "artikul": "0593",
      "idWB": "215916130",
      "color": "Белая",
      "sizeType": "малая",
      "dimensions": { "length": 23, "width": 17, "height": 7 },
      "weight": 0.195,
      "photo": [
        "images/small with bow/white/slide1.webp",
        "images/small with bow/white/slide2.webp",
        "images/small with bow/white/slide3.webp",
        "images/small with bow/white/slide4.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0594",
      "artikul": "0594",
      "idWB": "215916516",
      "color": "Красная",
      "sizeType": "малая",
      "dimensions": { "length": 23, "width": 17, "height": 7 },
      "weight": 0.195,
      "photo": [
        "images/small with bow/red/slide1.webp",
        "images/small with bow/red/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0595",
      "artikul": "0595",
      "idWB": "215916522",
      "color": "Оранжевая",
      "sizeType": "малая",
      "dimensions": { "length": 23, "width": 17, "height": 7 },
      "weight": 0.195,
      "photo": [
        "images/small with bow/orange/slide1.webp",
        "images/small with bow/orange/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0596",
      "artikul": "0596",
      "idWB": "274151258",
      "color": "Голубой лед",
      "sizeType": "малая",
      "dimensions": { "length": 22, "width": 16.5, "height": 8.8 },
      "weight": 0.245,
      "photo": [
        "images/small with bow/blue ice/slide1.webp",
        "images/small with bow/blue ice/slide2.webp",
        "images/small with bow/blue ice/slide3.webp",
        "images/small with bow/blue ice/slide4.webp"
      ],
      "videos": ["videos/Video 2.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0597",
      "artikul": "0597",
      "idWB": "274150707",
      "color": "Ванильная",
      "sizeType": "малая",
      "dimensions": { "length": 22, "width": 16.5, "height": 8.8 },
      "weight": 0.245,
      "photo": [
        "images/small with bow/vanilla/slide1.webp",
        "images/small with bow/vanilla/slide2.webp",
        "images/small with bow/vanilla/slide3.webp",
        "images/small with bow/vanilla/slide4.webp"
      ],
      "videos": ["videos/Video 2.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0598",
      "artikul": "0598",
      "idWB": "274149785",
      "color": "Золото",
      "sizeType": "малая",
      "dimensions": { "length": 22, "width": 16.5, "height": 8.8 },
      "weight": 0.245,
      "photo": [
        "images/small with bow/gold/slide1.webp",
        "images/small with bow/gold/slide2.webp",
        "images/small with bow/gold/slide3.webp",
        "images/small with bow/gold/slide4.webp"
      ],
      "videos": ["videos/Video 2.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "060",
      "artikul": "060",
      "idWB": "317924791",
      "color": "Розовая",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 19, "height": 8 },
      "weight": 0.25,
      "photo": [
        "images/medium with bow/pink/slide1.webp",
        "images/medium with bow/pink/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0601",
      "artikul": "0601",
      "idWB": "243454714",
      "color": "Тиффани",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 19, "height": 8 },
      "weight": 0.25,
      "photo": [
        "images/medium with bow/tiffany/slide1.webp",
        "images/medium with bow/tiffany/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0602",
      "artikul": "0602",
      "idWB": "243455326",
      "color": "Черная",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 19, "height": 8 },
      "weight": 0.25,
      "photo": [
        "images/medium with bow/black/slide1.webp",
        "images/medium with bow/black/slide2.webp",
        "images/medium with bow/black/slide3.webp",
        "images/medium with bow/black/slide4.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0603",
      "artikul": "0603",
      "idWB": "243455885",
      "color": "Белая",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 19, "height": 8 },
      "weight": 0.25,
      "photo": [
        "images/medium with bow/white/slide1.webp",
        "images/medium with bow/white/slide2.webp",
        "images/medium with bow/white/slide3.webp",
        "images/medium with bow/white/slide4.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0604",
      "artikul": "0604",
      "idWB": "243456194",
      "color": "Красная",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 19, "height": 8 },
      "weight": 0.25,
      "photo": [
        "images/medium with bow/red/slide1.webp",
        "images/medium with bow/red/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0605",
      "artikul": "0605",
      "idWB": "243456462",
      "color": "Оранжевая",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 19, "height": 8 },
      "weight": 0.25,
      "photo": [
        "images/medium with bow/orange/slide1.webp",
        "images/medium with bow/orange/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0609",
      "artikul": "0609",
      "idWB": "274190807",
      "color": "Лавандовая",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 17, "height": 11 },
      "weight": 0.25,
      "photo": [
        "images/medium with bow/lavender/slide1.webp",
        "images/medium with bow/lavender/slide2.webp",
        "images/medium with bow/lavender/slide3.webp",
        "images/medium with bow/lavender/slide4.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0640",
      "artikul": "0640",
      "idWB": "317924791",
      "color": "Персиковая",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 17, "height": 11 },
      "weight": 0.32,
      "photo": [
        "images/medium with bow/peach/slide1.webp",
        "images/medium with bow/peach/slide2.webp",
        "images/medium with bow/peach/slide3.webp",
        "images/medium with bow/peach/slide4.webp"
      ],
      "videos": ["videos/Video 1.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0642",
      "artikul": "0642",
      "idWB": "317925292",
      "color": "Черный муар",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 17, "height": 11 },
      "weight": 0.32,
      "photo": [
        "images/medium with bow/black moire/slide2.webp",
        "images/medium with bow/black moire/slide1.webp",
        "images/medium with bow/black moire/slide3.webp",
        "images/medium with bow/black moire/slide4.webp"
      ],
      "videos": ["videos/Video 1.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0643",
      "artikul": "0643",
      "idWB": "317542767",
      "color": "Белый бриллиант",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 17, "height": 11 },
      "weight": 0.32,
      "photo": [
        "images/medium with bow/white diamond/slide1.webp",
        "images/medium with bow/white diamond/slide2.webp",
        "images/medium with bow/white diamond/slide3.webp",
        "images/medium with bow/white diamond/slide4.webp"
      ],
      "videos": ["videos/Video 1.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0646",
      "artikul": "0646",
      "idWB": "317925740",
      "color": "Синий бархат",
      "sizeType": "средняя",
      "dimensions": { "length": 26, "width": 17, "height": 11 },
      "weight": 0.32,
      "photo": [
        "images/medium with bow/blue velvet/slide1.webp",
        "images/medium with bow/blue velvet/slide2.webp",
        "images/medium with bow/blue velvet/slide3.webp",
        "images/medium with bow/blue velvet/slide4.webp"
      ],
      "videos": ["videos/Video 1.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "061",
      "artikul": "061",
      "idWB": "243457427",
      "color": "Розовая",
      "sizeType": "большая",
      "dimensions": { "length": 31.5, "width": 26, "height": 10.5 },
      "weight": 0.44,
      "photo": [
        "images/big with bow/pink/slide1.webp",
        "images/big with bow/pink/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0611",
      "artikul": "0611",
      "idWB": "243457638",
      "color": "Тиффани",
      "sizeType": "большая",
      "dimensions": { "length": 31.5, "width": 26, "height": 10.5 },
      "weight": 0.44,
      "photo": [
        "images/big with bow/tiffany/slide1.webp",
        "images/big with bow/tiffany/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0612",
      "artikul": "0612",
      "idWB": "243458324",
      "color": "Черная",
      "sizeType": "большая",
      "dimensions": { "length": 31.5, "width": 26, "height": 10.5 },
      "weight": 0.44,
      "photo": [
        "images/big with bow/black/slide1.webp",
        "images/big with bow/black/slide2.webp",
        "images/big with bow/black/slide3.webp",
        "images/big with bow/black/slide4.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0613",
      "artikul": "0613",
      "idWB": "243458675",
      "color": "Белая",
      "sizeType": "большая",
      "dimensions": { "length": 31.5, "width": 26, "height": 10.5 },
      "weight": 0.44,
      "photo": [
        "images/big with bow/white/slide1.webp",
        "images/big with bow/white/slide2.webp",
        "images/big with bow/white/slide3.webp",
        "images/big with bow/white/slide4.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0614",
      "artikul": "0614",
      "idWB": "243458980",
      "color": "Красная",
      "sizeType": "большая",
      "dimensions": { "length": 31.5, "width": 26, "height": 10.5 },
      "weight": 0.44,
      "photo": [
        "images/big with bow/red/slide1.webp",
        "images/big with bow/red/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0615",
      "artikul": "0615",
      "idWB": "243459196",
      "color": "Оранжевая",
      "sizeType": "большая",
      "dimensions": { "length": 31.5, "width": 26, "height": 10.5 },
      "weight": 0.44,
      "photo": [
        "images/big with bow/orange/slide1.webp",
        "images/big with bow/orange/slide2.webp"
      ],
      "videos": ["videos/Video 0.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0616",
      "artikul": "0616",
      "idWB": "316806717",
      "color": "Голубой лед",
      "sizeType": "большая",
      "dimensions": { "length": 29, "width": 22, "height": 10.5 },
      "weight": 0.41,
      "photo": [
        "images/big with bow/blue ice/slide1.webp",
        "images/big with bow/blue ice/slide2.webp",
        "images/big with bow/blue ice/slide3.webp",
        "images/big with bow/blue ice/slide4.webp"
      ],
      "videos": ["videos/Video 2.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0617",
      "artikul": "0617",
      "idWB": "310899160",
      "color": "Ванильная",
      "sizeType": "большая",
      "dimensions": { "length": 29, "width": 22, "height": 10.5 },
      "weight": 0.41,
      "photo": [
        "images/big with bow/vanilla/slide1.webp",
        "images/big with bow/vanilla/slide2.webp",
        "images/big with bow/vanilla/slide3.webp",
        "images/big with bow/vanilla/slide4.webp"
      ],
      "videos": ["videos/Video 2.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0618",
      "artikul": "0618",
      "idWB": "310897278",
      "color": "Золото",
      "sizeType": "большая",
      "dimensions": { "length": 29, "width": 22, "height": 10.5 },
      "weight": 0.41,
      "photo": [
        "images/big with bow/gold/slide1.webp",
        "images/big with bow/gold/slide2.webp",
        "images/big with bow/gold/slide3.webp",
        "images/big with bow/gold/slide4.webp"
      ],
      "videos": ["videos/Video 2.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0650",
      "artikul": "0650",
      "idWB": "317926927",
      "color": "Персиковая",
      "sizeType": "большая",
      "dimensions": { "length": 30, "width": 24, "height": 10 },
      "weight": 0.41,
      "photo": [
        "images/big with bow/peach/slide1.webp",
        "images/big with bow/peach/slide2.webp",
        "images/big with bow/peach/slide3.webp",
        "images/big with bow/peach/slide4.webp"
      ],
      "videos": ["videos/Video 1.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0652",
      "artikul": "0652",
      "idWB": "317927629",
      "color": "Черный муар",
      "sizeType": "большая",
      "dimensions": { "length": 30, "width": 24, "height": 10 },
      "weight": 0.41,
      "photo": [
        "images/big with bow/black moire/slide1.webp",
        "images/big with bow/black moire/slide2.webp",
        "images/big with bow/black moire/slide3.webp",
        "images/big with bow/black moire/slide4.webp"
      ],
      "videos": ["videos/Video 1.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0653",
      "artikul": "0653",
      "idWB": "317926506",
      "color": "Белый бриллиант",
      "sizeType": "большая",
      "dimensions": { "length": 30, "width": 24, "height": 10 },
      "weight": 0.41,
      "photo": [
        "images/big with bow/white diamond/slide1.webp",
        "images/big with bow/white diamond/slide2.webp",
        "images/big with bow/white diamond/slide3.webp",
        "images/big with bow/white diamond/slide4.webp"
      ],
      "videos": ["videos/Video 1.mp4"]
    },
    {
      "name": "Подарочная коробка с лентой",
      "id": "0656",
      "artikul": "0656",
      "idWB": "317928114",
      "color": "Синий бархат",
      "sizeType": "большая",
      "dimensions": { "length": 30, "width": 24, "height": 10 },
      "weight": 0.41,
      "photo": [
        "images/big with bow/blue velvet/slide1.webp",
        "images/big with bow/blue velvet/slide2.webp",
        "images/big with bow/blue velvet/slide3.webp",
        "images/big with bow/blue velvet/slide4.webp"
      ],
      "videos": ["videos/Video 1.mp4"]
    },
    {
      "name": "Подарочная коробка с ручкой",
      "id": "062",
      "artikul": "062",
      "idWB": "244623727",
      "color": "Розовая",
      "sizeType": "малая",
      "dimensions": { "length": 30, "width": 23, "height": 11 },
      "weight": 0.43,
      "photo": [
        "images/boxes with handles/pink/slide1.webp",
        "images/boxes with handles/pink/slide2.webp"
      ],
      "videos": ["videos/Video 3.mp4"]
    },
    {
      "name": "Подарочная коробка с ручкой",
      "id": "0621",
      "artikul": "0621",
      "idWB": "244624458",
      "color": "Сиреневая",
      "sizeType": "малая",
      "dimensions": { "length": 30, "width": 23, "height": 11 },
      "weight": 0.43,
      "photo": [
        "images/boxes with handles/lilac/slide1.webp",
        "images/boxes with handles/lilac/slide2.webp"
      ],
      "videos": ["videos/Video 3.mp4"]
    },
    {
      "name": "Подарочная коробка с ручкой",
      "id": "0622",
      "artikul": "0622",
      "idWB": "244624620",
      "color": "Черная",
      "sizeType": "малая",
      "dimensions": { "length": 30, "width": 23, "height": 11 },
      "weight": 0.43,
      "photo": [
        "images/boxes with handles/black/slide1.webp",
        "images/boxes with handles/black/slide2.webp"
      ],
      "videos": ["videos/Video 3.mp4"]
    },
    {
      "name": "Подарочная коробка с ручкой",
      "id": "0623",
      "artikul": "0623",
      "idWB": "244625535",
      "color": "Белая",
      "sizeType": "малая",
      "dimensions": { "length": 30, "width": 23, "height": 11 },
      "weight": 0.43,
      "photo": [
        "images/boxes with handles/white/slide1.webp",
        "images/boxes with handles/white/slide2.webp"
      ],
      "videos": ["videos/Video 3.mp4"]
    },
    {
      "name": "Подарочная коробка с ручкой",
      "id": "0624",
      "artikul": "0624",
      "idWB": "244625536",
      "color": "Красная",
      "sizeType": "малая",
      "dimensions": { "length": 30, "width": 23, "height": 11 },
      "weight": 0.43,
      "photo": [
        "images/boxes with handles/red/slide1.webp",
        "images/boxes with handles/red/slide2.webp"
      ],
      "videos": ["videos/Video 3.mp4"]
    },
    {
      "name": "Подарочная коробка с ручкой",
      "id": "0625",
      "artikul": "0625",
      "idWB": "244625537",
      "color": "Оранжевая",
      "sizeType": "малая",
      "dimensions": { "length": 30, "width": 23, "height": 11 },
      "weight": 0.43,
      "photo": [
        "images/boxes with handles/orange/slide1.webp",
        "images/boxes with handles/orange/slide2.webp"
      ],
      "videos": ["videos/Video 3.mp4"]
    },
    {
      "name": "Подарочная коробка с ручкой",
      "id": "0626",
      "artikul": "0626",
      "idWB": "244625538",
      "color": "Золото",
      "sizeType": "малая",
      "dimensions": { "length": 30, "width": 23, "height": 11 },
      "weight": 0.43,
      "photo": [
        "images/boxes with handles/gold/slide1.webp",
        "images/boxes with handles/gold/slide2.webp"
      ],
      "videos": ["videos/Video 3.mp4"]
    },
    {
      "name": "Подарочная коробка с ручкой",
      "id": "0627",
      "artikul": "0627",
      "idWB": "244625539",
      "color": "Серебряная",
      "sizeType": "малая",
      "dimensions": { "length": 30, "width": 23, "height": 11 },
      "weight": 0.43,
      "photo": [
        "images/boxes with handles/silver/slide1.webp",
        "images/boxes with handles/silver/slide2.webp"
      ],
      "videos": ["videos/Video 3.mp4"]
    }
];

// Запуск импорта
async function runImport() {
    try {
        const response = await fetch('https://bsndismiessofvhglzrv.supabase.co/functions/v1/import-products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY'
            },
            body: JSON.stringify({
                products,
                admin_login: 'admin',
                admin_password: 'admin123'
            })
        });

        const result = await response.json();
        console.log('Результат импорта:', result);
        
        return result;
    } catch (error) {
        console.error('Ошибка импорта:', error);
        throw error;
    }
}

runImport();