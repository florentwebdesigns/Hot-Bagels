/* ==========================================================
   SPRINGFIELD HOT BAGELS — SHOP DETAILS
   This is the one file to edit for hours, menu items, prices
   and catering. Save, then refresh the page.

   Anything marked PLACEHOLDER still needs your real info.
   ========================================================== */
window.HB_DETAILS = {

  name: 'Springfield Hot Bagels',
  street: '207 Morris Avenue',
  streetShort: '207 Morris Ave',
  cityLine: 'Springfield, NJ 07081',
  phone: '(973) 379-5100',
  phoneLink: 'tel:+19733795100',
  orderUrl: 'https://springfieldhotbagels.com/',
  mapsQuery: '207 Morris Avenue, Springfield, NJ 07081',
  timeZone: 'America/New_York',

  /* PLACEHOLDER HOURS — replace with your real hours.
     Minutes after midnight: [open, close]. null = closed.
     360 = 6:00 AM, 900 = 3:00 PM. */
  hoursArePlaceholder: true,
  hours: {
    0: [360, 900],   // Sunday
    1: [360, 900],   // Monday
    2: [360, 900],   // Tuesday
    3: [360, 900],   // Wednesday
    4: [360, 900],   // Thursday
    5: [360, 900],   // Friday
    6: [360, 900],   // Saturday
  },

  /* The three bagels in the 3D opening.
     PLACEHOLDER: confirm these against your real menu. */
  flavors: [
    { id: 'everything', name: 'Everything', line: 'Sesame, poppy, onion, garlic and salt, all on one crust.' },
    { id: 'sesame', name: 'Sesame', line: 'Toasted sesame on a glossy, golden crust.' },
    { id: 'cinnamon', name: 'Cinnamon Raisin', line: 'A sweet cinnamon swirl, studded with raisins.' },
  ],

  /* MENU — PLACEHOLDER items and prices.
     price: '' shows a dashed "price" tag until you fill it in,
     for example price: '$3.50'.
     icon: bagel, spread, fish, egg, sandwich, wrap, soup, coffee, pastry */
  menuIsPlaceholder: true,
  menu: [
    {
      title: 'Bagels & spreads',
      items: [
        { name: 'Everything bagel', italic: true, icon: 'bagel', price: '' },
        { name: 'Sesame bagel', italic: true, icon: 'bagel', price: '' },
        { name: 'Poppy seed bagel', italic: true, icon: 'bagel', price: '' },
        { name: 'Cinnamon raisin bagel', italic: true, icon: 'bagel', price: '' },
        { name: 'Bagel with cream cheese', icon: 'spread', price: '' },
        { name: 'Lox and cream cheese', icon: 'fish', price: '' },
      ],
    },
    {
      title: 'Breakfast & egg sandwiches',
      items: [
        { name: 'Bacon, egg and cheese on an everything bagel', icon: 'egg', price: '' },
        { name: 'Egg sandwiches', note: 'Your bagel or roll', icon: 'egg', price: '' },
      ],
    },
    {
      title: 'Deli sandwiches & wraps',
      items: [
        { name: 'Deli sandwiches', note: 'Ask about today’s selection', icon: 'sandwich', price: '' },
        { name: 'Wraps', icon: 'wrap', price: '' },
      ],
    },
    {
      title: 'Homemade soups',
      items: [
        { name: 'Soup of the day', icon: 'soup', price: '' },
      ],
    },
    {
      title: 'Coffee & baked goods',
      items: [
        { name: 'Coffee', icon: 'coffee', price: '' },
        { name: 'Baked goods', note: 'Fresh daily', icon: 'pastry', price: '' },
      ],
    },
  ],

  /* CATERING — PLACEHOLDER: confirm what you offer. */
  catering: [
    { name: 'Bagel platters', note: 'Assorted bagels with spreads' },
    { name: 'Sandwich trays', note: 'Deli sandwiches and wraps' },
    { name: 'Coffee boxes', note: 'For offices and parties' },
  ],
};
