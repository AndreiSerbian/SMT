/**
 * Built-in template definitions for the customizer.
 * Each template has a name, description, and a list of objects to place.
 */

export const TEMPLATES = [
  {
    name: 'Логотип по центру',
    description: 'Один логотип в центре стороны',
    objects: [
      {
        type: 'text',
        text: 'LOGO',
        fontFamily: 'Montserrat',
        fontSize: 48,
        fill: '#1f2937',
      },
    ],
  },
  {
    name: 'Текст + подпись',
    description: 'Заголовок по центру и подпись внизу',
    objects: [
      {
        type: 'text',
        text: 'Заголовок',
        fontFamily: 'Playfair Display',
        fontSize: 36,
        fill: '#1f2937',
      },
      {
        type: 'text',
        text: 'Подпись',
        fontFamily: 'Inter',
        fontSize: 16,
        fill: '#6b7280',
      },
    ],
  },
  {
    name: 'Минимализм',
    description: 'Маленький текст в нижнем правом углу',
    objects: [
      {
        type: 'text',
        text: 'brand',
        fontFamily: 'Inter',
        fontSize: 14,
        fill: '#9ca3af',
      },
    ],
  },
  {
    name: 'Элегантный',
    description: 'Крупный текст с декоративным шрифтом',
    objects: [
      {
        type: 'text',
        text: 'Elegant',
        fontFamily: 'Playfair Display',
        fontSize: 56,
        fill: '#b45309',
      },
    ],
  },
];
