// The Springfield Hot Bagels menu for the 3D stage.
// PLACEHOLDER: names follow js/details.js (what the shop is known to sell). Prices are not confirmed yet,
// so price: '' shows "Price to be confirmed". Fill in real prices here AND in js/details.js.
// "Iced coffee" is a guess at what "coffee" covers: confirm with the owner.
export const CATS = [
  { id: 'bagels', name: 'Bagels & spreads', mood: ['#c2652a', '#ffc58e'], note: 'Boiled and baked fresh every morning in Springfield' },
  { id: 'breakfast', name: 'Breakfast sandwiches', mood: ['#c9921c', '#ffe08a'], note: 'Egg sandwiches on your bagel or a roll' },
  { id: 'deli', name: 'Deli, wraps & soup', mood: ['#8a8a2a', '#e8f0a8'], note: 'Ask about today’s deli selection and soup' },
  { id: 'coffee', name: 'Coffee', mood: ['#7a3e1c', '#ffd0a8'], note: 'Fresh coffee all morning' },
];

export const ITEMS = [
  { id: 'everything', cat: 'bagels', name: 'Everything', price: '', ing: 'Sesame, poppy, onion, garlic and salt, all on one crust',
    r: { type: 'bagel', flavor: 'everything', seed: 3 } },
  { id: 'sesame', cat: 'bagels', name: 'Sesame', price: '', ing: 'Toasted sesame on a glossy, golden crust',
    r: { type: 'bagel', flavor: 'sesame', seed: 4 } },
  { id: 'poppy', cat: 'bagels', name: 'Poppy seed', price: '', ing: 'Covered edge to edge in poppy seeds',
    r: { type: 'bagel', flavor: 'poppy', seed: 6 } },
  { id: 'cinnamon', cat: 'bagels', name: 'Cinnamon raisin', price: '', ing: 'A sweet cinnamon swirl, studded with raisins',
    r: { type: 'bagel', flavor: 'cinnamon', seed: 7 } },
  { id: 'cream-cheese', cat: 'bagels', name: 'Bagel with cream cheese', price: '', ing: 'Your bagel, sliced and schmeared',
    r: { type: 'sandwich', bread: 'sesame', seed: 8, fill: ['cream'], open: true } },
  { id: 'lox', cat: 'bagels', name: 'Lox and cream cheese', price: '', ing: 'Silky lox over cream cheese on your bagel',
    r: { type: 'sandwich', bread: 'everything', seed: 9, fill: ['creamThin', 'lox', 'onion'], open: true } },
  { id: 'bec', cat: 'breakfast', name: 'Bacon, egg & cheese', price: '', ing: 'On an everything bagel',
    r: { type: 'sandwich', bread: 'everything', seed: 11, fill: ['egg', 'bacon', 'cheese'] } },
  { id: 'egg-sandwich', cat: 'breakfast', name: 'Egg sandwich', price: '', ing: 'Egg and cheese on your bagel or a roll',
    r: { type: 'sandwich', bread: 'roll', seed: 12, fill: ['egg', 'cheese'] } },
  { id: 'deli', cat: 'deli', name: 'Deli sandwich', price: '', ing: 'Ask about today’s selection',
    r: { type: 'sandwich', bread: 'roll', seed: 13, fill: ['lettuce', 'turkey', 'cheese', 'tomato'] } },
  { id: 'wrap', cat: 'deli', name: 'Wraps', price: '', ing: 'Rolled to order and cut in half',
    r: { type: 'wrap', seed: 14 } },
  { id: 'soup', cat: 'deli', name: 'Soup of the day', price: '', ing: 'Homemade, ask what’s on today',
    r: { type: 'soup', seed: 15 } },
  { id: 'coffee', cat: 'coffee', name: 'Coffee', price: '', ing: 'Hot, fresh and ready to go',
    r: { type: 'hotcoffee', seed: 16 } },
  { id: 'iced-coffee', cat: 'coffee', name: 'Iced coffee', price: '', ing: 'Over ice, with a splash of milk',
    r: { type: 'drink', seed: 17, liquid: [[0, '#4a2612'], [.6, '#6e3d1d'], [.8, '#a8774c'], [1, '#d9b48c']], marble: .1, ice: 5, straw: '#f3efe6', fill: .9 } },
];
