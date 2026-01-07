import Product from '../models/Product.js';
import XLSX from 'xlsx';

/**
 * Excel import for products
 * Supports both creation and update of existing products by name
 */
export const importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Read Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      if (!row.Name) continue; // Skip rows without product name

      const data = {
        name: row.Name.trim(),
        category: row.Category || '',
        baseUnit: row.BaseUnit || 'No',
        packSize: row.PackSize || 1,
        unitCost: row.UnitCost || 0,
        price: row.SellingPrice || 0,
        taxRate: row.TaxRate || 0,
        description: row.Description || '',
        isActive: true
      };

      const existing = await Product.findOne({ name: data.name });

      if (existing) {
        await Product.findByIdAndUpdate(existing._id, data, { new: true });
        updated++;
      } else {
        await Product.create(data);
        created++;
      }
    }

    res.json({
      success: true,
      message: `Excel import completed: ${created} created, ${updated} updated`
    });
  } catch (error) {
    console.error('❌ Excel import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
