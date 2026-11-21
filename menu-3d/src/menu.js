// The Springfield Hot Bagels menu for the 3D stage: a selection from the real menu (js/menu-data.js).
// order = the exact item name in js/menu-data.js, so "Add to my order" picks the right line in the form.
// Prices come from the shop's online ordering menu (November 2026). Coffee comes with the Breakfast Special,
// but its price on its own is not listed, so it shows "Price to be confirmed".
export const CATS = [
  { id: 'bagels', name: 'Bagels & spreads', mood: ['#c2652a', '#ffc58e'], note: 'Boiled and baked fresh every morning in Springfield' },
  { id: 'breakfast', name: 'Breakfast', mood: ['#c9921c', '#ffe08a'], note: 'On a bagel, roll or bread. Egg whites or cheese for a little extra' },
  { id: 'bakery', name: 'Bakery', mood: ['#b0603a', '#ffcfb0'], note: 'Muffins, croissants and cakes, fresh every day' },
  { id: 'deli', name: 'Deli & lunch', mood: ['#8a8a2a', '#e8f0a8'], note: 'Boar’s Head meats, made to order' },
  { id: 'drinks', name: 'Drinks', mood: ['#7a3e1c', '#ffd0a8'], note: 'Pick your flavor at pickup' },
];

export const ITEMS = [
  { id: 'bagel', cat: 'bagels', name: 'Bagel', price: '$1.50', order: 'Bagel', ing: 'Everything, sesame, poppy, cinnamon raisin and more',
    r: { type: 'bagel', flavor: 'everything', seed: 3 } },
  { id: 'cream-cheese', cat: 'bagels', name: 'Bagel w/ cream cheese', price: '$3.25', order: 'Bagel w/ Cream Cheese', ing: 'Your bagel, sliced and schmeared',
    r: { type: 'sandwich', bread: 'sesame', seed: 8, fill: ['cream'], open: true } },
  { id: 'scallion', cat: 'bagels', name: 'Scallion cream cheese', price: '$5.50', order: 'Bagel w/ Scallion Cream Cheese', ing: 'Also vegetable, olive, walnut raisin and sun dried tomato',
    r: { type: 'sandwich', bread: 'poppy', seed: 10, fill: ['creamScallion'], open: true } },
  { id: 'nova', cat: 'bagels', name: 'Sliced nova & cream cheese', price: '$11.99', order: 'Bagel w/ Sliced Nova and Cream Cheese', ing: 'Silky smoked nova over cream cheese',
    r: { type: 'sandwich', bread: 'everything', seed: 9, fill: ['creamThin', 'lox', 'onion'], open: true } },
  { id: 'dozen', cat: 'bagels', name: 'Dozen bagels', price: '$18.00', order: 'Dozen Bagels', ing: 'Mix your flavors, just tell us how many of each',
    r: { type: 'dozen', seed: 2 } },

  { id: 'special', cat: 'breakfast', name: 'Breakfast Special', price: '$8.10', order: 'Breakfast Special', ing: 'Any breakfast sandwich and a small coffee, weekdays',
    r: { type: 'special', seed: 11 } },
  { id: 'bacon-egg', cat: 'breakfast', name: 'Bacon & egg', price: '$7.50', order: 'Bacon & Egg Sandwich', ing: 'Shown with cheese on an everything bagel',
    r: { type: 'sandwich', bread: 'everything', seed: 11, fill: ['egg', 'bacon', 'cheese'] } },
  { id: 'taylor', cat: 'breakfast', name: 'Taylor ham & egg', price: '$7.50', order: 'Taylor Ham & Egg Sandwich', ing: 'The Jersey classic, seared on the grill',
    r: { type: 'sandwich', bread: 'sesame', seed: 13, fill: ['egg', 'taylor'] } },
  { id: 'two-eggs', cat: 'breakfast', name: '2 eggs sandwich', price: '$4.80', order: '2 Eggs Sandwich', ing: 'On a bagel, roll or bread',
    r: { type: 'sandwich', bread: 'roll', seed: 12, fill: ['egg'] } },

  { id: 'croissant', cat: 'bakery', name: 'Croissant', price: '$2.50', order: 'Croissant', ing: 'With butter $3.50, with cream cheese $4.25',
    r: { type: 'croissant', seed: 21 } },
  { id: 'muffin', cat: 'bakery', name: 'Muffin', price: '$3.00', order: 'Plain Muffin', ing: 'Choose from today’s selection, toasted with butter $3.50',
    r: { type: 'muffin', seed: 7 } },
  { id: 'crumb-cake', cat: 'bakery', name: 'Crumb cake', price: '$3.00', order: 'Crumb Cake', ing: 'Buttery crumbs, powdered sugar',
    r: { type: 'crumbcake', seed: 31 } },
  { id: 'brownie', cat: 'bakery', name: 'Brownie', price: '$3.00', order: 'Brownie', ing: 'Rich, fudgy and chocolatey',
    r: { type: 'brownie', seed: 41 } },

  { id: 'pastrami', cat: 'deli', name: 'Hot pastrami', price: '$10.99', order: 'Hot Pastrami Sandwich', ing: 'Piled high and served hot',
    r: { type: 'sandwich', bread: 'roll', seed: 14, fill: ['pastrami'] } },
  { id: 'italian', cat: 'deli', name: 'Italian hero', price: '$11.99', order: 'C6. Italian Hero', ing: 'Ham, genoa salami, pepperoni and provolone with the works',
    r: { type: 'hero', seed: 41 } },
  { id: 'club', cat: 'deli', name: 'Turkey club', price: '$11.99', order: 'C9. Turkey Club Sandwich', ing: 'Triple decker on white toast, bacon, lettuce and tomato',
    r: { type: 'club', seed: 51 } },
  { id: 'buffalo-wrap', cat: 'deli', name: 'Buffalo chicken wrap', price: '$10.99', order: 'W8. Buffalo Chicken Wrap', ing: 'Hot sauce, bleu cheese, lettuce and tomato',
    r: { type: 'wrap', seed: 14, fillKind: 'buffalo' } },
  { id: 'soup', cat: 'deli', name: 'Soup of the day', price: '$3.90', order: 'Soup of the Day', ing: '16 oz. Call us for today’s soup',
    r: { type: 'soup', seed: 15 } },
  { id: 'greek', cat: 'deli', name: 'Greek salad', price: '$8.99', order: 'Greek Salad', ing: 'Romaine, tomato, cucumber, olives, grape leaves and feta',
    r: { type: 'salad', seed: 61 } },

  { id: 'coffee', cat: 'drinks', name: 'Coffee', price: '', order: 'Coffee', ing: 'Hot and fresh all morning',
    r: { type: 'hotcoffee', seed: 16 } },
  { id: 'oj', cat: 'drinks', name: 'Orange juice', price: '$3.00', order: 'Tropicana Orange Juice', ing: 'Tropicana, small or large available',
    r: { type: 'bottle', kind: 'juice', seed: 17 } },
  { id: 'soda', cat: 'drinks', name: 'Bottled soda', price: '$3.00', order: 'Bottled Soda (20 oz.)', ing: '20 oz. Plus Snapple, Gatorade, iced tea and more',
    r: { type: 'bottle', kind: 'soda', seed: 18 } },
  { id: 'water', cat: 'drinks', name: 'Bottled water', price: '$1.50', order: 'Small Bottled Water', ing: 'Large $2.40, extra large $3.60',
    r: { type: 'bottle', kind: 'water', seed: 19 } },
];
