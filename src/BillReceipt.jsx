import { openWhatsApp } from "./utils/whatsappUtils";

function BillReceipt({ bill, products, onClose }) {
  const productMap = {};
  products.forEach(p => {
    productMap[p.barcode] = p;
  });

  let parsedItems = [];
  try {
    // 1. Attempt to parse as JSON (used by online orders and some newer bill types)
    const jsonItems = JSON.parse(bill.items);
    if (Array.isArray(jsonItems)) {
      parsedItems = jsonItems.map(item => ({
        name: item.name || item.barcode || "Item",
        qty: item.qty || 1,
        price: item.price || 0
      }));
    }
  } catch (e) {
    // 2. Fallback to legacy comma-separated string format (barcode xQty)
    parsedItems = (bill.items || "").split(",").map(i => {
      const parts = i.trim().split(" x");
      const barcode = parts[0]?.trim();
      const qty = parts.length > 1 ? Number(parts[1]) : 1;

      // Look up by trimmed barcode
      const product = productMap[barcode];
      const price = product?.price || 0;

      return {
        name: product?.name || barcode,
        price: price,
        qty: isNaN(qty) ? 1 : qty
      };
    });
  }

  // 3. Final Fallback: If it's a single manual entry (like "Monthly Savings Deposit") 
  // and price is 0 but bill has amount, use the bill amount.
  if (parsedItems.length === 1 && parsedItems[0].price === 0 && bill.amount > 0) {
    parsedItems[0].price = bill.amount / parsedItems[0].qty;
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert("Please allow popups to print the receipt");
      return;
    }

    const itemsHtml = parsedItems.map(i => `
      <tr>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>₹ ${i.price * i.qty}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              padding: 20px; 
              width: 300px;
              font-size: 14px;
            }
            .center { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { border-bottom: 1px dashed #000; text-align: left; padding-bottom: 5px; }
            td { padding: 5px 0; }
            hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            .total-section { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3>🛒 Khatha Book</h3>
            <h4>${bill.billNumber?.startsWith('ORD-') ? 'INVOICE' : 'RECEIPT'}</h4>
            <p>Bill No: ${bill.billNumber}</p>
            <p>Date: ${bill.billDate}</p>
          </div>
          <hr />
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Amt</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <hr />
          <div class="total-section">
            <p><b>Total:</b> ₹ ${bill.amount}</p>
            <p><b>Paid:</b> ₹ ${bill.paidAmount}</p>
            <p><b>Status:</b> ${bill.status}</p>
            ${bill.paymentMode ? `<p><b>Method:</b> ${bill.paymentMode === "ONLINE" ? "Online Gateway" : bill.paymentMode}</p>` : ''}
            ${bill.gatewayTransactionRef ? `<p><b>Txn Ref:</b> ${bill.gatewayTransactionRef}</p>` : ''}
          </div>
          <div class="center" style="margin-top: 20px; font-size: 12px;">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="receipt-overlay">
      <div className="receipt-card">
        <h3>🛒 Khatha Book</h3>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', marginBottom: 10, display: 'block' }}>
          {bill.billNumber?.startsWith('ORD-') ? 'INVOICE' : 'RECEIPT'}
        </span>
        <p>Bill No: {bill.billNumber}</p>
        <p>Date: {bill.billDate}</p>
        <hr />

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Amt</th>
            </tr>
          </thead>
          <tbody>
            {parsedItems.map((i, idx) => (
              <tr key={idx}>
                <td>{i.name}</td>
                <td>{i.qty}</td>
                <td>₹ {i.price * i.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />
        <p><b>Total:</b> ₹ {bill.amount}</p>
        <p><b>Paid:</b> ₹ {bill.paidAmount}</p>
        <p><b>Status:</b> {bill.status}</p>
        {bill.paymentMode && <p><b>Method:</b> {bill.paymentMode === "ONLINE" ? "Online Gateway" : bill.paymentMode}</p>}
        {bill.gatewayTransactionRef && <p style={{ fontSize: '13px' }}><b>Txn Ref:</b> <code style={{ color: '#2563eb', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>{bill.gatewayTransactionRef}</code></p>}

        <div className="receipt-actions">
          <button onClick={handlePrint}>🖨 Print</button>
          <button onClick={() => openWhatsApp('bill', bill.id)} style={{ background: '#25d366', color: 'white', border: 'none' }}>WhatsApp</button>
          <button onClick={onClose}>❌ Close</button>
        </div>
      </div>
    </div>
  );
}

export default BillReceipt;
