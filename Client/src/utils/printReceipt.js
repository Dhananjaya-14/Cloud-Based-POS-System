export const printReceipt = (invoice) => {
  const printWindow = window.open("", "_blank");

  const subtotal = Number(invoice.subtotal || 0).toFixed(2);
  const discount = Number(invoice.discount || 0).toFixed(2);
  const tax = Number(invoice.tax || 0).toFixed(2);
  const total = Number(invoice.total || 0).toFixed(2);

  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt</title>

        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Courier New', monospace;
            width: 320px;
            margin: auto;
            padding: 15px;
            color: #000;
          }

          .header {
            text-align: center;
            margin-bottom: 15px;
          }

          .hotel-name {
            font-size: 22px;
            font-weight: bold;
          }

          .subtitle {
            font-size: 12px;
            color: #555;
          }

          .divider {
            border-top: 1px dashed #000;
            margin: 12px 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
            font-size: 14px;
          }

          .label {
            color: #444;
          }

          .value {
            font-weight: 600;
          }

          .summary {
            margin-top: 10px;
          }

          .grand-total {
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #000;
          }

          .payment {
            margin-top: 15px;
            text-align: center;
            border: 1px solid #000;
            padding: 10px;
            font-weight: bold;
            font-size: 15px;
          }

          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
          }

          .items {
            margin-top: 10px;
          }

          .item-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin: 4px 0;
          }

          @media print {
            body {
              width: 100%;
            }
          }
        </style>
      </head>

      <body>

        <div class="header">
          <div class="hotel-name">HOTEL POS</div>
          <div class="subtitle">Payment Receipt</div>
        </div>

        <div class="divider"></div>

        <div class="row">
          <span class="label">Invoice</span>
          <span class="value">${invoice.orderId}</span>
        </div>

        <div class="row">
          <span class="label">Cashier</span>
          <span class="value">${invoice.cashierName}</span>
        </div>

        <div class="row">
          <span class="label">Date</span>
          <span class="value">${new Date().toLocaleString()}</span>
        </div>

        <div class="divider"></div>

        <div class="items">
          ${invoice.items
            .map(
              (item) => `
                <div class="item-row">
                  <span>${item.pro_name} x ${item.qty}</span>
                  <span>$${Number(item.total).toFixed(2)}</span>
                </div>
              `
            )
            .join("")}
        </div>

        <div class="divider"></div>

        <div class="summary">

          <div class="row">
            <span>Subtotal</span>
            <span>$${subtotal}</span>
          </div>

          <div class="row">
            <span>Discount</span>
            <span>${discount}%</span>
          </div>

          <div class="row">
            <span>Tax</span>
            <span>$${tax}</span>
          </div>

          <div class="row grand-total">
            <span>Total</span>
            <span>$${total}</span>
          </div>

        </div>

        <div class="payment">
          ${invoice.paymentMethod}
        </div>

        <div class="footer">
          <p>Thank You For Your Visit!</p>
          <p>Please Come Again</p>
        </div>

      </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};