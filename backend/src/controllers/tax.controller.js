import Tax from '../models/Tax.js';

export const getAll = async (req, res) => {
  try {
    const taxes = await Tax.find().sort({ createdAt: -1 });
    res.json({ success: true, result: taxes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const tax = await Tax.findById(req.params.id);
    if (!tax) {
      return res.status(404).json({ success: false, message: 'Tax not found' });
    }
    res.json({ success: true, result: tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const tax = await Tax.create(req.body);
    res.status(201).json({ success: true, result: tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const tax = await Tax.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tax) {
      return res.status(404).json({ success: false, message: 'Tax not found' });
    }
    res.json({ success: true, result: tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const tax = await Tax.findByIdAndDelete(req.params.id);
    if (!tax) {
      return res.status(404).json({ success: false, message: 'Tax not found' });
    }
    res.json({ success: true, message: 'Tax deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};