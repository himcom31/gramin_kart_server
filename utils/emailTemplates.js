exports.driverWelcomeEmail = (fullName, phone, password) => ({
  subject: 'Welcome to GraminKart – Your Login Credentials',
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#16a34a;">Welcome to GraminKart! 🎉</h2>
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Your driver account has been created successfully.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-weight:600;">Login Credentials</p>
        <p style="margin:8px 0 0;">📱 Mobile &nbsp;: <strong>${phone}</strong></p>
        <p style="margin:4px 0 0;">🔒 Password: <strong>${password}</strong></p>
      </div>
      <p style="color:#6b7280;font-size:13px;">Please keep your credentials safe.</p>
      <p style="color:#16a34a;font-weight:600;">– GraminKart Team</p>
    </div>
  `,
});

exports.orderPlacedEmail = (name, orderId, total, paymentMethod) => ({
  subject: `Order Confirmed – #${orderId}`,
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
    
      <h2 style="color:#16a34a;">Order Confirmed! ✅</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your order has been placed successfully.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;"><strong>Order ID</strong> : #${orderId}</p>
        <p style="margin:6px 0 0;"><strong>Total</strong>    : ₹${total}</p>
        <p style="margin:6px 0 0;"><strong>Payment</strong>  : ${paymentMethod}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">We'll notify you once your order is shipped.</p>
      <p style="color:#16a34a;font-weight:600;">– GraminKart Team</p>
    </div>
  `,
});

exports.orderStatusEmail = (name, orderId, status) => {
  const statusMap = {
    Processing : { emoji: '⚙️', text: 'is now being processed.' },
    Shipped    : { emoji: '🚚', text: 'has been shipped and is on its way!' },
    Delivered  : { emoji: '✅', text: 'has been delivered successfully. Thank you!' },
    Cancelled  : { emoji: '❌', text: 'has been cancelled. Contact us for support.' },
    'Picked Up': { emoji: '📦', text: 'has been picked up by our driver.' },
    'On The Way': { emoji: '🛵', text: 'is almost there! Driver is on the way.' },
  };
  const info = statusMap[status] || { emoji: '📋', text: `status updated to ${status}.` };

  return {
    subject: `Order ${status} – #${orderId}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#16a34a;">${info.emoji} Order Update</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your order <strong>#${orderId}</strong> ${info.text}</p>
        <p style="color:#6b7280;font-size:13px;">Thank you for shopping with GraminKart.</p>
        <p style="color:#16a34a;font-weight:600;">– GraminKart Team</p>
      </div>
    `,
  };
};

exports.riderAssignedEmail = (customerName, orderId, driverName, driverPhone) => ({
  subject: `Driver Assigned – Order #${orderId}`,
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#16a34a;">🚴 Driver Assigned!</h2>
      <p>Hello <strong>${customerName}</strong>,</p>
      <p>A driver has been assigned to your order <strong>#${orderId}</strong>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;"><strong>Driver</strong> : ${driverName}</p>
        <p style="margin:6px 0 0;"><strong>Phone</strong>  : ${driverPhone}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">Your order is on its way!</p>
      <p style="color:#16a34a;font-weight:600;">– GraminKart Team</p>
    </div>
  `,
});

exports.driverAssignedEmail = (driverName, orderId, city, pincode, customerName, customerPhone) => ({
  subject: `New Order Assigned – #${orderId}`,
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#16a34a;">📦 New Delivery Assigned</h2>
      <p>Hello <strong>${driverName}</strong>,</p>
      <p>A new order has been assigned to you.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;"><strong>Order ID</strong>  : #${orderId}</p>
        <p style="margin:6px 0 0;"><strong>Customer</strong>  : ${customerName}</p>
        <p style="margin:6px 0 0;"><strong>Phone</strong>     : ${customerPhone}</p>
        <p style="margin:6px 0 0;"><strong>Address</strong>   : ${city}, ${pincode}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">Please pick it up as soon as possible.</p>
      <p style="color:#16a34a;font-weight:600;">– GraminKart Team</p>
    </div>
  `,
});