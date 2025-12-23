import { generateQuotationPDF } from '../utils/pdfGenerator.js';

export const generateQuotationPDF = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer')
      .populate('items.product');
    
    const company = await Company.findOne();
    const doc = await generateQuotationPDF(quotation, company);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quotation-${quotation.quotationNumber}.pdf"`);
    
    doc.pipe(res);
    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};