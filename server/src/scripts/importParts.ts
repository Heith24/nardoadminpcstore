import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, relative, resolve, sep } from 'node:path';
import { createPool } from '../config/database.js';
import { categoryRepository } from '../modules/categories/repositories/categoryRepository.js';
import { productRepository } from '../modules/products/repositories/productRepository.js';

const categoryNames: Record<string, string> = {
  aircooler: 'Air Cooler',
  case: 'Case',
  casefans: 'Case Fans',
  cpu: 'CPU',
  gpu: 'GPU',
  keyboard: 'Keyboard',
  liquidcooler: 'Liquid Cooler',
  mobo: 'Motherboard',
  mouse: 'Mouse',
  psu: 'PSU',
  ram: 'RAM',
  ssd: 'SSD'
};

const contentTypes: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

async function findImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return findImages(path);
    return contentTypes[extname(entry.name).toLowerCase()] ? [path] : [];
  }));
  return nested.flat();
}

async function importParts() {
  const partsDirectory = resolve(process.cwd(), '../parts');
  const files = await findImages(partsDirectory);
  const pool = await createPool();

  try {
    const categories = await categoryRepository.findAll();
    const categoriesByName = new Map(categories.map((category) => [category.name.toLowerCase(), category]));
    const products = await productRepository.findAll();
    const productsByKey = new Map(products.map((product) => [`${product.categoryId}:${product.name.toLowerCase()}`, product]));
    let inserted = 0;
    let imagesUpdated = 0;

    for (const file of files) {
      const parts = relative(partsDirectory, file).split(sep);
      const categoryName = categoryNames[parts[0].toLowerCase()];
      const category = categoryName ? categoriesByName.get(categoryName.toLowerCase()) : undefined;
      if (!category) throw new Error(`No database category for folder: ${parts[0]}`);

      const name = basename(file, extname(file));
      const key = `${category.id}:${name.toLowerCase()}`;
      const imageData = `data:${contentTypes[extname(file).toLowerCase()]};base64,${(await readFile(file)).toString('base64')}`;
      const existing = productsByKey.get(key);

      if (existing) {
        await productRepository.update(existing.id, { imageData });
        imagesUpdated += 1;
      } else {
        const product = await productRepository.create({ name, categoryId: category.id, price: 0, stock: 0, status: 'active', imageData });
        productsByKey.set(key, product);
        inserted += 1;
      }
    }

    console.log(`Parts import complete: ${inserted} products added, ${imagesUpdated} existing images updated.`);
    console.log('New products start with price 0 and stock 0; edit those values in the admin app.');
  } finally {
    await pool.close();
  }
}

importParts().catch((error: unknown) => {
  console.error('Parts import failed:', error);
  process.exitCode = 1;
});