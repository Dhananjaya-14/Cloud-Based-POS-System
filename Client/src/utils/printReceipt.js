import i18n from '../i18n';

export const printReceipt = (invoice, companySettings = {}) => {
  const lang = companySettings.language_code || 'en';
  const t = i18n.getFixedT(lang);

  const printWindow = window.open("", "_blank");

  const subtotal = Number(invoice.subtotal || 0).toFixed(2);
  const discount = Number(invoice.discount || 0).toFixed(2);
  const tax = Number(invoice.tax || 0).toFixed(2);
  const total = Number(invoice.total || 0).toFixed(2);
  
  const hotelName = companySettings.com_name || "HOTEL POS";
  const logoUrl = companySettings.bill_logo || "";
  
  let greeting = companySettings.bill_greeting || "";
  if (!greeting || greeting.replace(/\r/g, "") === "Thank You For Your Visit!\nPlease Come Again" || greeting === "Thank You For Your Visit! Please Come Again") {
    greeting = t("cashier.greeting", "Thank You For Your Visit!\nPlease Come Again");
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${t("cashier.receipt", "Receipt")}</title>

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
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" />` : ''}
          <div class="hotel-name">${hotelName}</div>
          ${companySettings.location ? `<div class="subtitle" style="font-size: 14px; margin-top: 4px;">${companySettings.location}</div>` : ''}
          ${companySettings.phone ? `<div class="subtitle" style="font-size: 14px; margin-top: 2px;">${companySettings.phone}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="row">
          <span class="label">${t("cashier.invoice_no", "Invoice No.")}</span>
          <span class="value">${invoice.orderId}</span>
        </div>

        <div class="row">
          <span class="label">${t("cashier.cashier", "Cashier")}</span>
          <span class="value">${invoice.cashierName}</span>
        </div>

        <div class="row">
          <span class="label">${t("reports.date", "Date")}</span>
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
            <span>${t("cashier.subtotal", "Subtotal")}</span>
            <span>$${subtotal}</span>
          </div>

          <div class="row">
            <span>${t("reports.discount", "Discount")}</span>
            <span>${discount}%</span>
          </div>

          <div class="row">
            <span>${t("cashier.tax", "Tax")}</span>
            <span>$${tax}</span>
          </div>

          <div class="row grand-total">
            <span>${t("cashier.total", "Total")}</span>
            <span>$${total}</span>
          </div>

        </div>

        <div class="payment">
          ${t("cashier.payment", "Payment")}: ${invoice.paymentMethod}
        </div>

        <div class="footer">
          ${greeting.split('\n').map(line => `<p>${line}</p>`).join('')}
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
