import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';

export type PaymentInput = {
  type: 'RECEIPT' | 'PAYMENT' | 'SELL_ITEM' | 'BUY_ITEM';
  mode?: 'CASH' | 'BANK' | 'UPI' | 'CREDIT';
  amount: string;
  referenceNumber?: string;
  customerId?: string;
  supplierId?: string;
  expenseCategoryId?: string;
  bankId?: string;
  notes?: string;
  itemName?: string;
  quantity?: string;
  rate?: string;
  userId: string;
};

export class AccountingService {
  static async recordTransaction(data: PaymentInput) {
    const amount = new Decimal(data.amount);
    
    if (amount.lte(0)) {
      throw new Error("Amount must be greater than zero.");
    }

    if ((data.mode === 'BANK' || data.mode === 'UPI') && !data.bankId) {
      throw new Error("Bank account is required for BANK or UPI transactions.");
    }

    const entityCount = [data.customerId, data.supplierId, data.expenseCategoryId].filter(Boolean).length;
    
    if (data.type === 'RECEIPT' || data.type === 'PAYMENT') {
      if (entityCount !== 1) {
        throw new Error("Transaction must apply to exactly one entity (Customer, Supplier, or Expense Category).");
      }
    } else {
      if (entityCount > 1) {
        throw new Error("Buy/Sell transactions cannot apply to multiple entities simultaneously.");
      }
      if (entityCount === 0 && data.mode === 'CREDIT') {
        throw new Error("Cannot record a credit transaction without selecting a party (Customer/Supplier).");
      }
    }

    return prisma.$transaction(async (tx) => {
      let transactionId: string | undefined = undefined;
      const isCredit = data.mode === 'CREDIT';

      // 1. If it's not credit, there is a money movement so create PaymentTransaction
      if (!isCredit) {
        const pTx = await tx.paymentTransaction.create({
          data: {
            type: (data.type === 'RECEIPT' || data.type === 'SELL_ITEM') ? 'RECEIPT' : 'PAYMENT',
            mode: data.mode as 'CASH' | 'BANK' | 'UPI',
            amount: amount.toNumber(),
            referenceNumber: data.referenceNumber,
            customerId: data.customerId,
            supplierId: data.supplierId,
            expenseCategoryId: data.expenseCategoryId,
            bankId: data.bankId,
            notes: data.notes,
            userId: data.userId
          }
        });
        transactionId = pTx.id;
      }

      // Helper vars
      const description = data.itemName 
        ? `${data.type === 'SELL_ITEM' ? 'Sale' : 'Purchase'} of ${data.itemName}${isCredit ? ' (CREDIT)' : ''}`
        : `${data.type === 'RECEIPT' ? 'Payment Received' : 'Payment Made'}${isCredit ? ' (CREDIT)' : ''} - Ref: ${data.referenceNumber || 'N/A'}`;

      // 2. Ledger Entry for the Item or Payment
      const ledgerEntries = [];
      
      const itemLedgerEntry = await tx.ledgerEntry.create({
        data: {
          customerId: data.customerId,
          supplierId: data.supplierId,
          expenseCategoryId: data.expenseCategoryId,
          transactionType: (data.type === 'RECEIPT' || data.type === 'BUY_ITEM') ? 'CREDIT' : 'DEBIT', 
          amount: amount.toNumber(),
          description: description,
          itemName: data.itemName,
          quantity: data.quantity ? new Decimal(data.quantity) : null,
          rate: data.rate ? new Decimal(data.rate) : null,
          referenceId: transactionId
        }
      });
      ledgerEntries.push(itemLedgerEntry);

      // If it's a Cash Sale/Purchase linked to a Customer/Supplier, we need a corresponding Payment Ledger Entry 
      // to offset the item ledger entry, so their net balance remains unchanged.
      if (!isCredit && (data.type === 'SELL_ITEM' || data.type === 'BUY_ITEM')) {
         if (data.customerId || data.supplierId) {
            const paymentLedgerEntry = await tx.ledgerEntry.create({
              data: {
                customerId: data.customerId,
                supplierId: data.supplierId,
                transactionType: data.type === 'SELL_ITEM' ? 'CREDIT' : 'DEBIT',
                amount: amount.toNumber(),
                description: `Instant Payment (${data.mode}) for ${data.itemName || 'Item'}`,
                referenceId: transactionId
              }
            });
            ledgerEntries.push(paymentLedgerEntry);
         }
      }

      // 3. Correcting Party Balance Logic:
      // If RECEIPT (Settle debt): Customer balance Decreases.
      // If SELL_ITEM (Sell on Credit): Customer balance Increases.
      // If PAYMENT (Settle debt): Supplier balance Decreases.
      // If BUY_ITEM (Buy on Credit): Supplier balance Increases.
      
      const promises: Promise<any>[] = [];

      if (data.customerId) {
        if (data.type === 'RECEIPT') {
          promises.push(tx.customer.update({
            where: { id: data.customerId },
            data: { balance: { decrement: amount.toNumber() } }
          }));
        } else if (data.type === 'SELL_ITEM' && isCredit) {
          promises.push(tx.customer.update({
            where: { id: data.customerId },
            data: { balance: { increment: amount.toNumber() } }
          }));
        }
      }

      if (data.supplierId) {
        if (data.type === 'PAYMENT') {
          promises.push(tx.supplier.update({
            where: { id: data.supplierId },
            data: { balance: { decrement: amount.toNumber() } }
          }));
        } else if (data.type === 'BUY_ITEM' && isCredit) {
          promises.push(tx.supplier.update({
            where: { id: data.supplierId },
            data: { balance: { increment: amount.toNumber() } }
          }));
        }
      }

      // 4. Update Bank Balance if applicable (and not credit)
      if (!isCredit && data.bankId && (data.mode === 'BANK' || data.mode === 'UPI')) {
        const isMoneyIn = data.type === 'RECEIPT' || data.type === 'SELL_ITEM';
        const incrementValue = isMoneyIn ? amount.toNumber() : -amount.toNumber();
        promises.push(tx.bank.update({
          where: { id: data.bankId },
          data: { balance: { increment: incrementValue } }
        }));
      }

      await Promise.all(promises);

      return { ledgerEntries, transactionId };
    });
  }

  /**
   * Cashier Confirmation for Procurement Outbound Payments
   */
  static async confirmProcurementPayment(data: {
    batchId: string;
    amount: number;
    mode: 'CASH' | 'BANK' | 'UPI';
    bankId?: string;
    referenceNumber?: string;
    notes?: string;
    userId: string;
  }) {
    const batch = await prisma.procurementBatch.findUnique({
      where: { id: data.batchId },
      include: { farmer: true, supplier: true, product: true }
    });

    if (!batch) throw new Error("Procurement batch not found.");
    if (batch.status !== 'FINALIZED' && batch.status !== 'PARTIALLY_PAID') {
      throw new Error("Only FINALIZED or PARTIALLY_PAID batches can receive payments.");
    }

    const farmerPayable = new Decimal(Number(batch.farmerTotalPayable || 0));
    const brokerCommission = new Decimal(Number(batch.brokerCommissionTotal || 0));
    const totalOutbound = farmerPayable.plus(brokerCommission);
    const amountPaidSoFar = new Decimal(Number(batch.amountPaid || 0));
    const remainingBalance = totalOutbound.minus(amountPaidSoFar);

    if (remainingBalance.lte(0)) {
      throw new Error("This batch is already fully paid.");
    }

    const paymentAmount = new Decimal(data.amount);
    if (paymentAmount.lte(0) || paymentAmount.gt(remainingBalance)) {
      throw new Error(`Invalid payment amount. Must be between 0 and ${remainingBalance.toNumber()}`);
    }

    if ((data.mode === 'BANK' || data.mode === 'UPI') && !data.bankId) {
      throw new Error("Bank account is required for BANK or UPI transactions.");
    }

    return prisma.$transaction(async (tx) => {
      const farmerPaidSoFar = Decimal.min(amountPaidSoFar, farmerPayable);
      
      const farmerRemaining = farmerPayable.minus(farmerPaidSoFar);
      const farmerPayment = Decimal.min(paymentAmount, farmerRemaining);
      const brokerPayment = paymentAmount.minus(farmerPayment);

      const newAmountPaid = amountPaidSoFar.plus(paymentAmount);
      const isFullyPaid = newAmountPaid.gte(totalOutbound);

      // 1. Update Batch
      await tx.procurementBatch.update({
        where: { id: data.batchId },
        data: { 
          amountPaid: newAmountPaid.toNumber(),
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          fullyPaidAt: isFullyPaid ? new Date() : null
        }
      });

      // 2. Process Farmer Payment & Ledger if applicable
      if (batch.farmerId && farmerPayment.gt(0)) {
        await tx.farmer.update({
          where: { id: batch.farmerId },
          data: { balance: { decrement: farmerPayment.toNumber() } }
        });

        const farmerTx = await tx.paymentTransaction.create({
          data: {
            type: 'PAYMENT',
            mode: data.mode,
            amount: farmerPayment.toNumber(),
            referenceNumber: data.referenceNumber,
            supplierId: batch.supplierId,
            procurementBatchId: batch.id,
            bankId: data.bankId,
            notes: `Cashier Partial Payment to Farmer: ${batch.farmer?.name || 'N/A'} for Batch #${batch.id.slice(-8)}. ${data.notes || ''}`.trim(),
            userId: data.userId
          }
        });

        await tx.ledgerEntry.create({
          data: {
            farmerId: batch.farmerId,
            transactionType: 'DEBIT',
            amount: farmerPayment.toNumber(),
            description: `Payment Settled by Cashier (${data.mode}) - Ref: ${data.referenceNumber || 'N/A'}`,
            referenceId: farmerTx.id
          }
        });
      }

      // 3. Process Broker Commission Payment & Ledger if applicable
      if (brokerPayment.gt(0)) {
        await tx.supplier.update({
          where: { id: batch.supplierId },
          data: { balance: { decrement: brokerPayment.toNumber() } }
        });

        const brokerTx = await tx.paymentTransaction.create({
          data: {
            type: 'PAYMENT',
            mode: data.mode,
            amount: brokerPayment.toNumber(),
            referenceNumber: data.referenceNumber,
            supplierId: batch.supplierId,
            procurementBatchId: batch.id,
            bankId: data.bankId,
            notes: `Cashier Partial Payment for Broker Commission: ${batch.supplier.name} for Batch #${batch.id.slice(-8)}. ${data.notes || ''}`.trim(),
            userId: data.userId
          }
        });

        await tx.ledgerEntry.create({
          data: {
            supplierId: batch.supplierId,
            transactionType: 'DEBIT',
            amount: brokerPayment.toNumber(),
            description: `Broker Commission Settled by Cashier (${data.mode}) - Ref: ${data.referenceNumber || 'N/A'}`,
            referenceId: brokerTx.id
          }
        });
      }

      // 4. Update Bank Balance if BANK or UPI
      if (data.bankId && (data.mode === 'BANK' || data.mode === 'UPI')) {
        await tx.bank.update({
          where: { id: data.bankId },
          data: { balance: { decrement: paymentAmount.toNumber() } }
        });
      }

      return batch;
    });
  }

  /**
   * Cashier Confirmation for Sales Inbound Receipts
   */
  static async confirmSalesReceipt(data: {
    invoiceId: string;
    amount: number;
    mode: 'CASH' | 'BANK' | 'UPI';
    bankId?: string;
    referenceNumber?: string;
    notes?: string;
    userId: string;
  }) {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: data.invoiceId },
      include: { customer: true, items: true }
    });

    if (!invoice) throw new Error("Sales invoice not found.");
    if (invoice.status !== 'FINALIZED' && invoice.status !== 'PARTIALLY_PAID') {
      throw new Error("Only FINALIZED or PARTIALLY_PAID sales invoices can receive payments.");
    }

    const totalInbound = new Decimal(Number(invoice.grandTotal));
    const amountPaidSoFar = new Decimal(Number(invoice.amountPaid || 0));
    const remainingBalance = totalInbound.minus(amountPaidSoFar);

    if (remainingBalance.lte(0)) {
      throw new Error("This invoice is already fully paid.");
    }

    const receiptAmount = new Decimal(data.amount);
    if (receiptAmount.lte(0) || receiptAmount.gt(remainingBalance)) {
      throw new Error(`Invalid receipt amount. Must be between 0 and ${remainingBalance.toNumber()}`);
    }

    if ((data.mode === 'BANK' || data.mode === 'UPI') && !data.bankId) {
      throw new Error("Bank account is required for BANK or UPI transactions.");
    }

    return prisma.$transaction(async (tx) => {
      const newAmountPaid = amountPaidSoFar.plus(receiptAmount);
      const isFullyPaid = newAmountPaid.gte(totalInbound);

      // 1. Update Sales Invoice
      await tx.salesInvoice.update({
        where: { id: data.invoiceId },
        data: { 
          amountPaid: newAmountPaid.toNumber(),
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          fullyPaidAt: isFullyPaid ? new Date() : null
        }
      });

      // 2. Decrement Customer Balance (Credit customer account)
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { balance: { decrement: receiptAmount.toNumber() } }
      });

      // 3. Create Payment Transaction
      const receiptTx = await tx.paymentTransaction.create({
        data: {
          type: 'RECEIPT',
          mode: data.mode,
          amount: receiptAmount.toNumber(),
          referenceNumber: data.referenceNumber,
          customerId: invoice.customerId,
          salesInvoiceId: invoice.id,
          bankId: data.bankId,
          notes: `Cashier Partial Receipt for Sales Invoice ${invoice.invoiceNumber}. ${data.notes || ''}`.trim(),
          userId: data.userId
        }
      });

      // 4. Create Ledger Entry for Customer
      await tx.ledgerEntry.create({
        data: {
          customerId: invoice.customerId,
          transactionType: 'CREDIT',
          amount: receiptAmount.toNumber(),
          description: `Invoice ${invoice.invoiceNumber} Payment Received (${data.mode}) - Ref: ${data.referenceNumber || 'N/A'}`,
          referenceId: receiptTx.id
        }
      });

      // 5. Update Bank Balance if BANK or UPI
      if (data.bankId && (data.mode === 'BANK' || data.mode === 'UPI')) {
        await tx.bank.update({
          where: { id: data.bankId },
          data: { balance: { increment: receiptAmount.toNumber() } }
        });
      }

      return invoice;
    });
  }

  /**
   * Cashier Confirmation for Sales Refund (when invoice amount decreases below amount paid)
   */
  static async confirmSalesRefund(data: {
    invoiceId: string;
    amount: number;
    mode: 'CASH' | 'BANK' | 'UPI';
    bankId?: string;
    referenceNumber?: string;
    notes?: string;
    userId: string;
  }) {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: data.invoiceId },
      include: { customer: true }
    });

    if (!invoice) throw new Error("Sales invoice not found.");
    
    const totalInbound = new Decimal(Number(invoice.grandTotal));
    const amountPaidSoFar = new Decimal(Number(invoice.amountPaid || 0));
    const refundDue = amountPaidSoFar.minus(totalInbound);

    if (refundDue.lte(0)) {
      throw new Error("No refund is due for this invoice.");
    }

    const refundAmount = new Decimal(data.amount);
    if (refundAmount.lte(0) || refundAmount.gt(refundDue)) {
      throw new Error(`Invalid refund amount. Must be between 0 and ${refundDue.toNumber()}`);
    }

    if ((data.mode === 'BANK' || data.mode === 'UPI') && !data.bankId) {
      throw new Error("Bank account is required for BANK or UPI transactions.");
    }

    return prisma.$transaction(async (tx) => {
      const newAmountPaid = amountPaidSoFar.minus(refundAmount);
      const isFullyPaid = newAmountPaid.lte(totalInbound);

      // 1. Update Sales Invoice
      await tx.salesInvoice.update({
        where: { id: data.invoiceId },
        data: { 
          amountPaid: newAmountPaid.toNumber(),
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          fullyPaidAt: isFullyPaid ? new Date() : null
        }
      });

      // 2. Increment Customer Balance (Debit customer account since we are giving money back, reducing their credit balance)
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { balance: { increment: refundAmount.toNumber() } }
      });

      // 3. Create Payment Transaction (This is a PAYMENT to customer)
      const refundTx = await tx.paymentTransaction.create({
        data: {
          type: 'PAYMENT',
          mode: data.mode,
          amount: refundAmount.toNumber(),
          referenceNumber: data.referenceNumber,
          customerId: invoice.customerId,
          salesInvoiceId: invoice.id,
          bankId: data.bankId,
          notes: `Cashier Refund for Sales Invoice ${invoice.invoiceNumber}. ${data.notes || ''}`.trim(),
          userId: data.userId
        }
      });

      // 4. Create Ledger Entry for Customer
      await tx.ledgerEntry.create({
        data: {
          customerId: invoice.customerId,
          transactionType: 'DEBIT',
          amount: refundAmount.toNumber(),
          description: `Invoice ${invoice.invoiceNumber} Refund Issued (${data.mode}) - Ref: ${data.referenceNumber || 'N/A'}`,
          referenceId: refundTx.id
        }
      });

      // 5. Update Bank Balance if BANK or UPI
      if (data.bankId && (data.mode === 'BANK' || data.mode === 'UPI')) {
        await tx.bank.update({
          where: { id: data.bankId },
          data: { balance: { decrement: refundAmount.toNumber() } }
        });
      }

      return invoice;
    });
  }

  /**
   * Cashier Confirmation for Packing Material Outbound Payments
   */
  static async confirmPackingItemPayment(data: {
    packingItemId: string;
    amount: number;
    mode: 'CASH' | 'BANK' | 'UPI';
    bankId?: string;
    referenceNumber?: string;
    notes?: string;
    userId: string;
  }) {
    const item = await prisma.packingItem.findUnique({
      where: { id: data.packingItemId },
      include: { supplier: true, godown: true }
    });

    if (!item) throw new Error("Packing material item not found.");
    if (item.status !== 'FINALIZED' && item.status !== 'PARTIALLY_PAID') {
      throw new Error("Only FINALIZED or PARTIALLY_PAID packing material procurements can receive payments.");
    }

    const totalPayable = new Decimal(Number(item.quantityBags)).times(new Decimal(Number(item.perBagRate)));
    const amountPaidSoFar = new Decimal(Number(item.amountPaid || 0));
    const remainingBalance = totalPayable.minus(amountPaidSoFar);

    if (remainingBalance.lte(0)) {
      throw new Error("This packing material order is already fully paid.");
    }

    const paymentAmount = new Decimal(data.amount);
    if (paymentAmount.lte(0) || paymentAmount.gt(remainingBalance)) {
      throw new Error(`Invalid payment amount. Must be between 0 and ${remainingBalance.toNumber()}`);
    }

    if ((data.mode === 'BANK' || data.mode === 'UPI') && !data.bankId) {
      throw new Error("Bank account is required for BANK or UPI transactions.");
    }

    return prisma.$transaction(async (tx) => {
      const newAmountPaid = amountPaidSoFar.plus(paymentAmount);
      const isFullyPaid = newAmountPaid.gte(totalPayable);

      // 1. Mark PackingItem as PAID/PARTIALLY_PAID
      await tx.packingItem.update({
        where: { id: data.packingItemId },
        data: { 
          amountPaid: newAmountPaid.toNumber(),
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          fullyPaidAt: isFullyPaid ? new Date() : null
        }
      });

      // 2. Process Supplier Payment & Ledger if supplier is linked
      if (item.supplierId) {
        await tx.supplier.update({
          where: { id: item.supplierId },
          data: { balance: { decrement: paymentAmount.toNumber() } }
        });

        const supplierTx = await tx.paymentTransaction.create({
          data: {
            type: 'PAYMENT',
            mode: data.mode,
            amount: paymentAmount.toNumber(),
            referenceNumber: data.referenceNumber,
            supplierId: item.supplierId,
            packingItemId: item.id,
            bankId: data.bankId,
            notes: `Cashier Partial Payment for Packing Bags: ${item.brandName} (${Number(item.quantityBags)} bags @ ${item.godown.name}). ${data.notes ?? ''}`.trim(),
            userId: data.userId
          }
        });

        await tx.ledgerEntry.create({
          data: {
            supplierId: item.supplierId,
            transactionType: 'DEBIT',
            amount: paymentAmount.toNumber(),
            description: `Packing Bags Procurement Settled by Cashier (${data.mode}) - Ref: ${data.referenceNumber || 'N/A'}`,
            referenceId: supplierTx.id
          }
        });
      }

      // 3. Update Bank Balance if BANK or UPI
      if (data.bankId && (data.mode === 'BANK' || data.mode === 'UPI')) {
        await tx.bank.update({
          where: { id: data.bankId },
          data: { balance: { decrement: paymentAmount.toNumber() } }
        });
      }

      return item;
    });
  }

  static async deleteTransaction(transactionId: string) {
    return prisma.$transaction(async (tx) => {
      const pTx = await tx.paymentTransaction.findUnique({
        where: { id: transactionId }
      });
      if (!pTx) return;

      await tx.ledgerEntry.deleteMany({
        where: { referenceId: transactionId }
      });

      if (pTx.bankId && (pTx.mode === 'BANK' || pTx.mode === 'UPI')) {
        if (pTx.type === 'PAYMENT') {
          await tx.bank.update({
            where: { id: pTx.bankId },
            data: { balance: { increment: pTx.amount } }
          });
        } else if (pTx.type === 'RECEIPT') {
          await tx.bank.update({
            where: { id: pTx.bankId },
            data: { balance: { decrement: pTx.amount } }
          });
        }
      }

      await tx.paymentTransaction.delete({
        where: { id: transactionId }
      });
    });
  }
}
