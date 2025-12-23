import Company from '../models/Company.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'company');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    cb(null, `logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Get templates (combined settings for frontend)
export const getTemplates = async (req, res) => {
  try {
    let company = await Company.findOne();

    if (!company) {
      company = await Company.create({
        name: "Your Company (Pvt) Ltd",
        address: "Colombo, Sri Lanka",
        phone: "+94 11 234 5678",
        email: "info@company.lk",
        currency: "LKR",
        currencySymbol: "Rs.",
        defaultTerms: "Payment due within 30 days.",
        defaultNotes: "Thank you for your business!",
        invoiceFooter: "This invoice was created on a computer and is valid without the signature and seal",
        quoteFooter: "This quotation was created on a computer and is valid without the signature and seal",
        offerFooter: "This offer was created on a computer and is valid without the signature and seal",
        lastInvoiceNumber: 0,
        lastQuoteNumber: 0,
        lastOfferNumber: 0,
        lastPaymentNumber: 0,
      });
    }

    return res.json({
      success: true,
      result: {
        companySettings: {
          name: company.name || "",
          address: company.address || "",
          state: company.state || "",
          country: company.country || "",
          email: company.email || "",
          phone: company.phone || "",
          website: company.website || "",
          taxNumber: company.taxNumber || "",
          vatNumber: company.vatNumber || "",
          regNumber: company.regNumber || "",
          logo: company.logo || null,
          logoUrl: company.logo
            ? `${req.protocol}://${req.get("host")}/${company.logo.replace(/\\/g, "/")}`
            : null,
        },
        currencySettings: {
          currency: company.currency || "LKR",
          currencySymbol: company.currencySymbol || "Rs.",
        },
        pdfSettings: {
          invoiceFooter: company.invoiceFooter || "",
          quoteFooter: company.quoteFooter || "",
          offerFooter: company.offerFooter || "",
        },
        financeSettings: {
          lastInvoiceNumber: company.lastInvoiceNumber ?? 0,
          lastQuoteNumber: company.lastQuoteNumber ?? 0,
          lastOfferNumber: company.lastOfferNumber ?? 0,
          lastPaymentNumber: company.lastPaymentNumber ?? 0,
        },
        templates: {
          quotation: {
            notes: company.defaultNotes || "",
            terms: company.defaultTerms || "",
          },
          invoice: {
            notes: company.defaultNotes || "",
            terms: company.defaultTerms || "",
          },
          offer: {
            notes: company.defaultNotes || "",
            terms: company.defaultTerms || "",
          },
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get company settings - FIXED: Added all footer fields
export const getSettings = async (req, res) => {
  try {
    let company = await Company.findOne();

    if (!company) {
      company = await Company.create({
        name: "Your Company (Pvt) Ltd",
        address: "Colombo, Sri Lanka",
        phone: "+94 11 234 5678",
        email: "info@company.lk",
        currency: "LKR",
        currencySymbol: "Rs.",
        defaultTerms: "Payment due within 30 days.",
        defaultNotes: "Thank you for your business!",
        invoiceFooter: "This invoice was created on a computer and is valid without the signature and seal",
        quoteFooter: "This quotation was created on a computer and is valid without the signature and seal",
        offerFooter: "This offer was created on a computer and is valid without the signature and seal"
      });
    }

    const logoUrl = company.logo 
      ? `${req.protocol}://${req.get("host")}/${company.logo.replace(/\\/g, "/")}`
      : null;

    return res.json({
      success: true,
      result: {
        ...company.toObject(),
        logoUrl
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update company settings
export const updateSettings = async (req, res) => {
  try {
    const updateData = req.body;
    
    // Find the company document (there should only be one)
    let company = await Company.findOne();

    if (!company) {
      // Create new company if doesn't exist
      company = await Company.create(updateData);
    } else {
      // Update existing company
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'logo') {
          company[key] = updateData[key];
        }
      });
      await company.save();
    }

    const logoUrl = company.logo 
      ? `${req.protocol}://${req.get("host")}/${company.logo.replace(/\\/g, "/")}`
      : null;

    return res.json({
      success: true,
      message: 'Company settings updated successfully',
      result: {
        ...company.toObject(),
        logoUrl
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Upload company logo
export const uploadLogo = [
  upload.single('logo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      // Get or create company
      let company = await Company.findOne();
      if (!company) {
        company = await Company.create({
          name: "Your Company (Pvt) Ltd",
          address: "Colombo, Sri Lanka",
          phone: "+94 11 234 5678",
          email: "info@company.lk"
        });
      }

      // Delete old logo if exists
      if (company.logo) {
        const oldLogoPath = path.join(process.cwd(), company.logo);
        try {
          await fs.unlink(oldLogoPath);
        } catch (err) {
          console.log('Old logo file not found or already deleted');
        }
      }

      // Update with new logo path
      const logoPath = path.join('uploads', 'company', req.file.filename);
      company.logo = logoPath;
      await company.save();

      const logoUrl = `${req.protocol}://${req.get("host")}/${logoPath.replace(/\\/g, "/")}`;

      return res.json({
        success: true,
        message: 'Logo uploaded successfully',
        result: {
          logo: logoPath,
          logoUrl
        }
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
];

// Delete company logo
export const deleteLogo = async (req, res) => {
  try {
    const company = await Company.findOne();

    if (!company || !company.logo) {
      return res.status(404).json({ 
        success: false, 
        message: 'No logo found' 
      });
    }

    // Delete the logo file
    const logoPath = path.join(process.cwd(), company.logo);
    try {
      await fs.unlink(logoPath);
    } catch (err) {
      console.log('Logo file not found or already deleted');
    }

    // Remove logo from database
    company.logo = null;
    await company.save();

    return res.json({
      success: true,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get default terms and conditions
export const getDefaultTerms = async (req, res) => {
  try {
    const company = await Company.findOne();

    if (!company) {
      return res.json({
        success: true,
        result: {
          defaultTerms: 'Payment due within 30 days.',
          defaultNotes: 'Thank you for your business!'
        }
      });
    }

    return res.json({
      success: true,
      result: {
        defaultTerms: company.defaultTerms || '',
        defaultNotes: company.defaultNotes || ''
      }
    });
  } catch (error) {
    console.error('Error fetching default terms:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update default terms and conditions
export const updateDefaultTerms = async (req, res) => {
  try {
    const { defaultTerms, defaultNotes } = req.body;

    let company = await Company.findOne();

    if (!company) {
      company = await Company.create({
        name: "Your Company (Pvt) Ltd",
        defaultTerms,
        defaultNotes
      });
    } else {
      if (defaultTerms !== undefined) company.defaultTerms = defaultTerms;
      if (defaultNotes !== undefined) company.defaultNotes = defaultNotes;
      await company.save();
    }

    return res.json({
      success: true,
      message: 'Default terms and notes updated successfully',
      result: {
        defaultTerms: company.defaultTerms,
        defaultNotes: company.defaultNotes
      }
    });
  } catch (error) {
    console.error('Error updating default terms:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};