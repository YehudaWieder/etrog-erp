export const SHIPMENT_DETAILS_PRINT_EXTRA_STYLES = `
  .shipment-details-print__content {
    display: grid;
    gap: 14px;
  }
  .shipment-details-print__card {
    border: 1px solid #d6e0d8;
    border-radius: 14px;
    background: #fff;
    padding: 12px;
    display: grid;
    gap: 12px;
  }
  .shipment-details-print__card-head {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
    direction: ltr;
    text-align: left;
    color: #243f2b;
    font-weight: 600;
  }
  .shipment-details-print__card-head p {
    margin: 0;
    width: 100%;
    max-width: 100%;
    direction: inherit;
    unicode-bidi: plaintext;
  }
  html[dir='rtl'] .shipment-details-print__card-head {
    direction: rtl;
    text-align: right;
  }
  .shipment-details-print__card-note {
    margin: 0;
    color: #2f4536;
    line-height: 1.45;
    border-top: 1px dashed #d0dcd3;
    padding-top: 8px;
  }
  .shipment-details-print__title {
    margin: 0;
    color: #214f2a;
    font-size: 15px;
  }
  .shipment-details-print__table-wrap {
    overflow-x: auto;
  }
  .shipment-details-print__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .shipment-details-print__table th,
  .shipment-details-print__table td {
    border: 1px solid #ccd9cf;
    padding: 6px 7px;
    text-align: center;
    line-height: 1.15;
    vertical-align: middle;
  }
  .shipment-details-print__table th {
    background: #f1f7f3;
    color: #284f31;
    font-weight: 700;
    white-space: nowrap;
  }
  .shipment-details-print__table tbody tr:nth-child(even) {
    background: #f8fcf9;
  }
  .shipment-details-print__row-label {
    font-weight: 700;
    background: #f6fbf8;
  }
  .shipment-details-print__row-total {
    background: #e7f2eb !important;
  }
  .shipment-details-print__row-total td {
    font-weight: 800;
    color: #1f4f29;
    border-top: 2px solid #96b89e;
  }
  .shipment-details-print__note-hide {
    display: none;
  }
  .shipment-details-print__note-text {
    display: inline;
    font-size: 11px;
    color: #2f4536;
  }
`;
