import mongoose from 'mongoose';

const compatibleBikeSchema = new mongoose.Schema({
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  variant: { type: String, trim: true, default: '' },
  yearFrom: { type: Number, min: 1900, max: 2100 },
  yearTo: { type: Number, min: 1900, max: 2100 },
  compatibilitySource: { type: String, trim: true, default: '' },
}, { _id: false });

const locationSchema = new mongoose.Schema({
  rack: { type: String, required: true, trim: true },
  shelf: { type: String, trim: true, default: '' },
  box: { type: String, trim: true, default: '' },
  quantity: { type: Number, min: 0, required: true, default: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  productCode: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  category: { type: String, trim: true, default: 'Other', index: true },
  manufacturer: { type: String, trim: true, default: '' },
  manufacturerPartNumber: { type: String, trim: true, default: '', index: true },
  compatibleBikes: { type: [compatibleBikeSchema], default: [] },
  purchasePrice: { type: Number, min: 0, default: 0 },
  sellingPrice: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0 },
  minimumStock: { type: Number, min: 0, default: 0 },
  locations: { type: [locationSchema], default: [] },
  notes: { type: String, trim: true, default: '' },
}, { timestamps: true });

productSchema.index({ name: 'text', productCode: 'text', manufacturerPartNumber: 'text' });
productSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock <= this.minimumStock) return 'low-stock';
  return 'in-stock';
});
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export default mongoose.model('Product', productSchema);
