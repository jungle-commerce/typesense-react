import { faker } from '@faker-js/faker';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  brand: string;
  sku: string;
  in_stock: boolean;
  stock_quantity: number;
  rating: number;
  review_count: number;
  images: string[];
  tags: string[];
  created_at: number;
  updated_at: number;
  discount_percentage?: number;
  features: string[];
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

const categories = [
  { name: 'Electronics', subcategories: ['Smartphones', 'Laptops', 'Tablets', 'Headphones', 'Cameras', 'Smart Home'] },
  { name: 'Clothing', subcategories: ['Men\'s Shirts', 'Women\'s Dresses', 'Shoes', 'Accessories', 'Outerwear', 'Activewear'] },
  { name: 'Home & Kitchen', subcategories: ['Furniture', 'Cookware', 'Bedding', 'Decor', 'Appliances', 'Storage'] },
  { name: 'Sports & Outdoors', subcategories: ['Exercise Equipment', 'Camping', 'Cycling', 'Team Sports', 'Water Sports', 'Winter Sports'] },
  { name: 'Beauty & Personal Care', subcategories: ['Skincare', 'Makeup', 'Hair Care', 'Fragrances', 'Bath & Body', 'Tools'] },
  { name: 'Books', subcategories: ['Fiction', 'Non-Fiction', 'Textbooks', 'Children\'s Books', 'Comics', 'Audiobooks'] },
  { name: 'Toys & Games', subcategories: ['Action Figures', 'Board Games', 'Puzzles', 'Dolls', 'Building Sets', 'Educational'] },
  { name: 'Food & Grocery', subcategories: ['Snacks', 'Beverages', 'Organic', 'International', 'Pantry Staples', 'Fresh'] }
];

const brands = [
  'TechPro', 'StyleMax', 'HomeEssentials', 'SportZone', 'BeautyLux',
  'BookWorld', 'PlayTime', 'GourmetChoice', 'EcoLife', 'PremiumBrand',
  'ValueMart', 'InnovateTech', 'FashionForward', 'ComfortHome', 'ActiveLife',
  'NaturalBeauty', 'SmartKids', 'HealthyChoice', 'UrbanStyle', 'ClassicBrand'
];

const productFeatures = [
  'Eco-friendly', 'Sustainable', 'Organic', 'Handmade', 'Premium Quality',
  'Limited Edition', 'Best Seller', 'New Arrival', 'Award Winning', 'Customer Favorite',
  'Free Shipping', 'Extended Warranty', 'Money Back Guarantee', 'Fast Delivery',
  'Exclusive Design', 'Patent Pending', 'Certified', 'Lab Tested', 'Recommended',
  'Trending', 'Sale', 'Clearance', 'Bundle Deal', 'Gift Set'
];

function generateProduct(index: number): Product {
  const categoryIndex = faker.number.int({ min: 0, max: categories.length - 1 });
  const category = categories[categoryIndex];
  const subcategory = faker.helpers.arrayElement(category.subcategories);
  const brand = faker.helpers.arrayElement(brands);
  const price = faker.number.float({ min: 9.99, max: 2999.99, multipleOf: 0.01 });
  const hasDiscount = faker.datatype.boolean(0.3); // 30% chance of discount
  const inStock = faker.datatype.boolean(0.85); // 85% chance of being in stock
  
  return {
    id: `prod_${index + 1}`,
    name: `${brand} ${faker.commerce.productName()}`,
    description: faker.commerce.productDescription() + ' ' + faker.lorem.sentences(2),
    price,
    category: category.name,
    subcategory,
    brand,
    sku: faker.string.alphanumeric(10).toUpperCase(),
    in_stock: inStock,
    stock_quantity: inStock ? faker.number.int({ min: 0, max: 500 }) : 0,
    rating: faker.number.float({ min: 1, max: 5, multipleOf: 0.1 }),
    review_count: faker.number.int({ min: 0, max: 1000 }),
    images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => 
      faker.image.url()
    ),
    tags: faker.helpers.arrayElements(productFeatures, { min: 2, max: 6 }),
    created_at: faker.date.past({ years: 2 }).getTime() / 1000,
    updated_at: faker.date.recent({ days: 30 }).getTime() / 1000,
    discount_percentage: hasDiscount ? faker.number.int({ min: 5, max: 50 }) : undefined,
    features: faker.helpers.arrayElements([
      faker.commerce.productMaterial(),
      faker.color.human(),
      faker.commerce.productAdjective(),
      faker.lorem.word()
    ], { min: 3, max: 6 }),
    weight: faker.number.float({ min: 0.1, max: 50, multipleOf: 0.1 }),
    dimensions: {
      length: faker.number.float({ min: 1, max: 100, multipleOf: 0.1 }),
      width: faker.number.float({ min: 1, max: 100, multipleOf: 0.1 }),
      height: faker.number.float({ min: 1, max: 100, multipleOf: 0.1 })
    }
  };
}

// Generate 150 diverse products
export const ecommerceProducts: Product[] = Array.from({ length: 150 }, (_, i) => generateProduct(i));

// Special test cases
export const specialProducts: Product[] = [
  {
    id: 'prod_special_1',
    name: 'Ultra Premium Wireless Headphones with Active Noise Cancellation',
    description: 'Experience crystal-clear audio with our top-of-the-line wireless headphones featuring advanced noise cancellation technology.',
    price: 399.99,
    category: 'Electronics',
    subcategory: 'Headphones',
    brand: 'TechPro',
    sku: 'TPWH001ANC',
    in_stock: true,
    stock_quantity: 50,
    rating: 4.8,
    review_count: 2345,
    images: ['image1.jpg', 'image2.jpg', 'image3.jpg'],
    tags: ['Best Seller', 'Premium Quality', 'Award Winning', 'Free Shipping'],
    created_at: Date.now() / 1000 - 86400 * 180,
    updated_at: Date.now() / 1000 - 86400,
    features: ['Bluetooth 5.0', '40-hour battery', 'Foldable design', 'Premium leather'],
    weight: 0.3,
    dimensions: { length: 20, width: 18, height: 8 }
  },
  {
    id: 'prod_special_2',
    name: 'Budget Smartphone Basic Model',
    description: 'Affordable smartphone with essential features for everyday use.',
    price: 99.99,
    category: 'Electronics',
    subcategory: 'Smartphones',
    brand: 'ValueMart',
    sku: 'VMSP001B',
    in_stock: true,
    stock_quantity: 200,
    rating: 3.5,
    review_count: 156,
    images: ['budget_phone.jpg'],
    tags: ['Budget Friendly', 'Value for Money'],
    created_at: Date.now() / 1000 - 86400 * 90,
    updated_at: Date.now() / 1000 - 86400 * 7,
    discount_percentage: 20,
    features: ['Dual SIM', 'Basic camera', '32GB storage'],
    weight: 0.15,
    dimensions: { length: 14, width: 7, height: 0.8 }
  },
  {
    id: 'prod_special_3',
    name: 'Luxury Designer Handbag Limited Edition',
    description: 'Exclusive designer handbag crafted from premium Italian leather. Only 100 pieces worldwide.',
    price: 2499.99,
    category: 'Clothing',
    subcategory: 'Accessories',
    brand: 'StyleMax',
    sku: 'SMHB001LE',
    in_stock: false,
    stock_quantity: 0,
    rating: 5.0,
    review_count: 45,
    images: ['luxury_bag1.jpg', 'luxury_bag2.jpg', 'luxury_bag3.jpg', 'luxury_bag4.jpg'],
    tags: ['Limited Edition', 'Luxury', 'Handmade', 'Exclusive Design'],
    created_at: Date.now() / 1000 - 86400 * 30,
    updated_at: Date.now() / 1000 - 86400 * 2,
    features: ['Italian leather', 'Gold hardware', 'Silk lining', 'Certificate of authenticity'],
    weight: 1.2,
    dimensions: { length: 35, width: 12, height: 28 }
  },
  {
    id: 'prod_special_4',
    name: 'Organic Green Tea Collection Gift Set',
    description: 'Premium collection of 12 different organic green teas from around the world. Perfect for tea enthusiasts.',
    price: 59.99,
    category: 'Food & Grocery',
    subcategory: 'Beverages',
    brand: 'GourmetChoice',
    sku: 'GCGT001GS',
    in_stock: true,
    stock_quantity: 75,
    rating: 4.6,
    review_count: 789,
    images: ['tea_set1.jpg', 'tea_set2.jpg'],
    tags: ['Organic', 'Gift Set', 'Premium Quality', 'Sustainable'],
    created_at: Date.now() / 1000 - 86400 * 120,
    updated_at: Date.now() / 1000 - 86400 * 5,
    discount_percentage: 15,
    features: ['USDA Organic', '12 varieties', 'Bamboo box', 'Brewing guide included'],
    weight: 0.5,
    dimensions: { length: 30, width: 20, height: 10 }
  },
  {
    id: 'prod_special_5',
    name: 'Professional Gaming Chair with RGB Lighting',
    description: 'Ergonomic gaming chair with customizable RGB lighting, lumbar support, and premium materials.',
    price: 449.99,
    category: 'Home & Kitchen',
    subcategory: 'Furniture',
    brand: 'SportZone',
    sku: 'SZGC001RGB',
    in_stock: true,
    stock_quantity: 25,
    rating: 4.7,
    review_count: 432,
    images: ['gaming_chair1.jpg', 'gaming_chair2.jpg', 'gaming_chair3.jpg'],
    tags: ['Best Seller', 'Gaming', 'Ergonomic', 'RGB Lighting'],
    created_at: Date.now() / 1000 - 86400 * 60,
    updated_at: Date.now() / 1000 - 86400 * 3,
    features: ['Adjustable height', 'Memory foam', '180-degree recline', 'USB powered RGB'],
    weight: 25,
    dimensions: { length: 70, width: 70, height: 130 }
  }
];

// Combine all products
export const allEcommerceProducts = [...ecommerceProducts, ...specialProducts];

// Helper function to get products by criteria
export function getProductsByCategory(category: string): Product[] {
  return allEcommerceProducts.filter(p => p.category === category);
}

export function getProductsByBrand(brand: string): Product[] {
  return allEcommerceProducts.filter(p => p.brand === brand);
}

export function getProductsInPriceRange(min: number, max: number): Product[] {
  return allEcommerceProducts.filter(p => p.price >= min && p.price <= max);
}

export function getProductsInStock(): Product[] {
  return allEcommerceProducts.filter(p => p.in_stock);
}

export function getProductsOnSale(): Product[] {
  return allEcommerceProducts.filter(p => p.discount_percentage !== undefined);
}

// Export test data statistics for validation
export const ecommerceDataStats = {
  totalProducts: allEcommerceProducts.length,
  categories: [...new Set(allEcommerceProducts.map(p => p.category))],
  brands: [...new Set(allEcommerceProducts.map(p => p.brand))],
  priceRange: {
    min: Math.min(...allEcommerceProducts.map(p => p.price)),
    max: Math.max(...allEcommerceProducts.map(p => p.price))
  },
  inStockCount: allEcommerceProducts.filter(p => p.in_stock).length,
  outOfStockCount: allEcommerceProducts.filter(p => !p.in_stock).length,
  onSaleCount: allEcommerceProducts.filter(p => p.discount_percentage).length
};