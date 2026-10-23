import mongoose from 'mongoose';
import Product from '../models/Product.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeSearchFilter(q) {
  if (!q?.trim()) return {};
  const safe = escapeRegex(q.trim());
  const rx = new RegExp(safe, 'i');
  return {
    $or: [
      { name: rx },
      { productCode: rx },
      { manufacturerPartNumber: rx },
      { manufacturer: rx },
      { category: rx },
      { 'compatibleBikes.brand': rx },
      { 'compatibleBikes.model': rx },
      { 'compatibleBikes.variant': rx },
    ],
  };
}

export async function listProducts(req, res, next) {
  try {
    const filter = makeSearchFilter(String(req.query.q ?? ''));
    if (req.query.status === 'low-stock') filter.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minimumStock'] }] };
    if (req.query.status === 'out-of-stock') filter.stock = 0;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
    const products = await Product.find(filter).sort({ name: 1 }).limit(limit).lean();
    res.json({ count: products.length, products: products.map(p => ({ ...p, stockStatus: p.stock === 0 ? 'out-of-stock' : p.stock <= p.minimumStock ? 'low-stock' : 'in-stock' })) });
  } catch (error) { next(error); }
}

export async function productStats(_req, res, next) {
  try {
    const [total, units, low, out] = await Promise.all([
      Product.countDocuments(),
      Product.aggregate([{ $group: { _id: null, total: { $sum: '$stock' } } }]),
      Product.countDocuments({ $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minimumStock'] }] } }),
      Product.countDocuments({ stock: 0 }),
    ]);
    res.json({ products: total, units: units[0]?.total ?? 0, low, out });
  } catch (error) { next(error); }
}

export async function getProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) { next(error); }
}

function validateProduct(body, partial = false) {
  const errors = [];
  if (!partial || body.name !== undefined) if (!String(body.name ?? '').trim()) errors.push('Product name is required');
  if (!partial || body.productCode !== undefined) if (!String(body.productCode ?? '').trim()) errors.push('Product code is required');
  for (const key of ['stock', 'minimumStock', 'purchasePrice', 'sellingPrice']) {
    if (body[key] !== undefined && (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0)) errors.push(`${key} must be a non-negative number`);
  }
  if (body.compatibleBikes !== undefined && !Array.isArray(body.compatibleBikes)) errors.push('compatibleBikes must be an array');
  if (body.locations !== undefined && !Array.isArray(body.locations)) errors.push('locations must be an array');
  return errors;
}

export async function createProduct(req, res, next) {
  try {
    const errors = validateProduct(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join('. ') });
    const product = await Product.create(req.body);
    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'That product code already exists. Use a unique code for each distinct product/SKU.' });
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
    const errors = validateProduct(req.body, true);
    if (errors.length) return res.status(400).json({ message: errors.join('. ') });
    const allowed = ['productCode', 'name', 'category', 'manufacturer', 'manufacturerPartNumber', 'compatibleBikes', 'purchasePrice', 'sellingPrice', 'stock', 'minimumStock', 'locations', 'notes'];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product updated', product });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'That product code already exists.' });
    next(error);
  }
}

export async function adjustStock(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
    const quantityChange = Number(req.body.quantityChange);
    const reason = String(req.body.reason ?? '').trim();
    if (!Number.isInteger(quantityChange) || quantityChange === 0) return res.status(400).json({ message: 'quantityChange must be a non-zero whole number (positive to add, negative to remove)' });
    if (!reason) return res.status(400).json({ message: 'A reason is required for stock adjustments' });
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, ...(quantityChange < 0 ? { stock: { $gte: Math.abs(quantityChange) } } : {}) },
      { $inc: { stock: quantityChange, ...(req.body.locationIndex !== undefined ? { [`locations.${Number(req.body.locationIndex)}.quantity`]: quantityChange } : {}) } },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(409).json({ message: 'Product not found or there is not enough stock for this adjustment' });
    res.json({ message: 'Stock adjusted', reason, product });
  } catch (error) { next(error); }
}
