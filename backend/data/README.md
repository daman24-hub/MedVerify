Place your CSV files here before running import:

1. cdsco.csv
2. jan_aushadhi.csv

Accepted column aliases (case-insensitive, symbols ignored):
- name: name, brand_name, medicine_name, drug_name
- manufacturer: manufacturer, company, company_name
- approvalStatus: approval_status, approvalstatus, status
- genericName: generic_name, genericname, salt, composition
- brandPrice: brand_price, brandprice, mrp, price
- genericPrice: generic_price, genericprice, jan_aushadhi_price, ja_price

Run import command:
npm run import:data
