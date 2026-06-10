const jwt    = require('jsonwebtoken');
const Driver = require('../models/Driver');

const protectDriver1 = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authorized' });

  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'driver')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const driver = await Driver.findById(decoded.id);
    if (!driver || !driver.isActive)
      return res.status(401).json({ success: false, message: 'Driver not found or inactive' });

    delete driver.password;   // replaces .select('-password')
    req.driver = driver;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const protectDriver = async (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authorized' });

  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);

    if (decoded.role !== 'driver')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const driver = await Driver.findById(decoded.id);
    if (!driver || !driver.isActive)
      return res.status(401).json({ success: false, message: 'Driver not found or inactive' });

    delete driver.password;   // replaces .select('-password')
    req.driver = driver;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { protectDriver };