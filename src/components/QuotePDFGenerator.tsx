import { jsPDF } from 'jspdf';
import { Quote, Customer } from '../types';

interface GeneratePDFOptions {
  quote: Quote;
  customer: Customer;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  storeEmail?: string;
}

export const generateQuotePDF = ({
  quote,
  customer,
  storeName,
  storePhone,
  storeAddress,
  storeEmail
}: GeneratePDFOptions) => {
  // Crear documento PDF en formato carta (letter)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter' // 215.9 x 279.4 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Colores corporativos
  const primaryColor: [number, number, number] = [220, 38, 127]; // Rosa/Magenta
  const secondaryColor: [number, number, number] = [33, 33, 33]; // Gris oscuro
  const accentColor: [number, number, number] = [255, 105, 180]; // Rosa claro

  // Función auxiliar para verificar si necesitamos nueva página
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Función auxiliar para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // ============================================
  // ENCABEZADO
  // ============================================
  
  // Fondo del encabezado
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Nombre de la tienda
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(storeName, margin, 20);

  // Información de contacto
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (storePhone) doc.text(`Tel: ${storePhone}`, margin, 28);
  if (storeEmail) doc.text(`Email: ${storeEmail}`, margin, 33);
  if (storeAddress) doc.text(storeAddress, margin, 38);

  // "COTIZACIÓN" en el lado derecho
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN', pageWidth - margin, 20, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${quote.id}`, pageWidth - margin, 28, { align: 'right' });
  doc.text(new Date(quote.createdAt).toLocaleDateString('es-CO'), pageWidth - margin, 34, { align: 'right' });

  yPosition = 55;

  // ============================================
  // INFORMACIÓN DEL CLIENTE
  // ============================================
  
  checkNewPage(35);

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPosition, contentWidth, 30, 'F');

  doc.setTextColor(...secondaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL CLIENTE', margin + 5, yPosition + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${customer.name}`, margin + 5, yPosition + 15);
  doc.text(`Teléfono: ${customer.phone}`, margin + 5, yPosition + 21);
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, margin + 5, yPosition + 27);
  }

  // Validez de la cotización (lado derecho)
  doc.setFont('helvetica', 'bold');
  doc.text('Válida hasta:', pageWidth - margin - 60, yPosition + 15);
  doc.setFont('helvetica', 'normal');
  const validUntil = new Date(quote.validUntil).toLocaleDateString('es-CO');
  doc.text(validUntil, pageWidth - margin - 60, yPosition + 21);

  yPosition += 40;

  // ============================================
  // TABLA DE PRODUCTOS
  // ============================================

  checkNewPage(40);

  // Encabezado de la tabla
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPosition, contentWidth, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const colWidths = {
    product: contentWidth * 0.45,
    quantity: contentWidth * 0.15,
    unitPrice: contentWidth * 0.20,
    total: contentWidth * 0.20
  };

  doc.text('PRODUCTO', margin + 2, yPosition + 7);
  doc.text('CANT.', margin + colWidths.product + 2, yPosition + 7);
  doc.text('PRECIO UNIT.', margin + colWidths.product + colWidths.quantity + 2, yPosition + 7);
  doc.text('TOTAL', pageWidth - margin - 2, yPosition + 7, { align: 'right' });

  yPosition += 12;

  // Filas de productos
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');

  quote.items.forEach((item, index) => {
    checkNewPage(15);

    // Fondo alternado
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition - 2, contentWidth, 12, 'F');
    }

    // Nombre del producto (con ajuste de texto si es muy largo)
    const productName = item.productName.length > 35 
      ? item.productName.substring(0, 32) + '...' 
      : item.productName;
    
    doc.setFontSize(9);
    doc.text(productName, margin + 2, yPosition + 5);
    doc.text(item.quantity.toString(), margin + colWidths.product + 2, yPosition + 5);
    doc.text(formatCurrency(item.unitPrice), margin + colWidths.product + colWidths.quantity + 2, yPosition + 5);
    doc.text(formatCurrency(item.total), pageWidth - margin - 2, yPosition + 5, { align: 'right' });

    yPosition += 12;
  });

  // Línea separadora
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  
  yPosition += 10;

  // ============================================
  // TOTALES
  // ============================================

  checkNewPage(40);

  const totalsX = pageWidth - margin - 70;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);

  // Subtotal
  doc.text('Subtotal:', totalsX, yPosition);
  doc.text(formatCurrency(quote.subtotal), pageWidth - margin - 2, yPosition, { align: 'right' });
  yPosition += 7;

  // Descuento
  if (quote.discount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text('Descuento:', totalsX, yPosition);
    doc.text(`-${formatCurrency(quote.discount)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
    yPosition += 7;
    doc.setTextColor(...secondaryColor);
  }

  // Envío
  if (quote.shippingCost > 0) {
    doc.text('Envío:', totalsX, yPosition);
    doc.text(formatCurrency(quote.shippingCost), pageWidth - margin - 2, yPosition, { align: 'right' });
    yPosition += 7;
  }

  // Línea antes del total
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(totalsX - 5, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL:', totalsX, yPosition);
  doc.text(formatCurrency(quote.total), pageWidth - margin - 2, yPosition, { align: 'right' });

  yPosition += 15;

  // ============================================
  // TÉRMINOS Y CONDICIONES
  // ============================================

  checkNewPage(35);

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPosition, contentWidth, 25, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('TÉRMINOS Y CONDICIONES', margin + 5, yPosition + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('• Esta cotización es válida hasta la fecha indicada.', margin + 5, yPosition + 13);
  doc.text('• Los precios pueden variar sin previo aviso.', margin + 5, yPosition + 17);
  doc.text('• Productos sujetos a disponibilidad en inventario.', margin + 5, yPosition + 21);

  // ============================================
  // PIE DE PÁGINA
  // ============================================

  // Ir al final de la página
  yPosition = pageHeight - 20;

  doc.setFillColor(...primaryColor);
  doc.rect(0, yPosition, pageWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Gracias por su preferencia', pageWidth / 2, yPosition + 8, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`${storeName} - Cotización generada el ${new Date().toLocaleDateString('es-CO')}`, 
    pageWidth / 2, yPosition + 14, { align: 'center' });

  // Numeración de páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // ============================================
  // GUARDAR PDF
  // ============================================

  const fileName = `Cotizacion-${quote.id}-${customer.name.replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
};

export default generateQuotePDF;