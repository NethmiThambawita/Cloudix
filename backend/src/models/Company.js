import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  email: String,
  taxNumber: String,
  website: String,
  currency: { type: String, default: 'LKR' },
  currencySymbol: { type: String, default: 'Rs.' },
  logo: String, // URL or base64 of logo
  
  // Default Terms & Conditions
  defaultTerms: {
    type: String,
    default: 'Payment due within 30 days. Late payments may incur additional charges.'
  },
  
  // Default Notes
  defaultNotes: {
    type: String,
    default: 'Thank you for your business!'
  },
  
  // PDF Footers - FIXED: Added quoteFooter and offerFooter
  invoiceFooter: {
    type: String,
    default: 'This invoice was created on a computer and is valid without the signature and seal'
  },
  
  quoteFooter: {
    type: String,
    default: 'This quotation was created on a computer and is valid without the signature and seal'
  },
  
  offerFooter: {
    type: String,
    default: 'This offer was created on a computer and is valid without the signature and seal'
  },
  
  // Document Prefixes
  prefixes: {
    quotation: { type: String, default: 'SQ-' },
    purchaseOrder: { type: String, default: 'PO-' },
    invoice: { type: String, default: 'SI-' },
    payment: { type: String, default: 'PAY-' },
    supplierPayment: { type: String, default: 'SUPPAY-' }
  },
  
  // Tax Settings
  taxSettings: {
    enableTax: { type: Boolean, default: true },
    defaultTaxRate: { type: Number, default: 0 },
    taxLabel: { type: String, default: 'VAT' },
    taxNumber: String
  }
}, { timestamps: true });

export default mongoose.model('Company', companySchema);