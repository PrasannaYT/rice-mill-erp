const fs = require('fs');
let content = fs.readFileSync('src/components/AccountingDashboardClient.tsx', 'utf8');

// The grouping logic to inject
const groupingLogic = 
              <div className="space-y-4">
                {(() => {
                  if (transactions.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <CheckCircle2 className="w-12 h-12 text-[var(--dust)] mx-auto mb-2" />
                        <p className="font-bold text-[var(--muted)]">No recent history.</p>
                      </div>
                    );
                  }

                  const groupedTxs = transactions.reduce((acc: any, tx: any) => {
                    const recordId = tx.procurementBatch?.id || tx.salesInvoice?.id || tx.packingItem?.id || tx.id;
                    const isCompleted = tx.procurementBatch?.status === 'PAID' || tx.salesInvoice?.status === 'PAID' || tx.packingItem?.status === 'PAID';
                    
                    if (!acc[recordId]) {
                      acc[recordId] = {
                        id: recordId,
                        isCompleted,
                        entityName: tx.customer?.name || tx.supplier?.name || tx.expenseCategory?.name || 'Manual Transaction',
                        type: tx.procurementBatch ? 'Procurement' : tx.salesInvoice ? 'Sales' : tx.packingItem ? 'Packing' : tx.expenseCategory ? 'Expense' : 'Manual',
                        transactions: []
                      };
                    }
                    acc[recordId].transactions.push(tx);
                    return acc;
                  }, {});

                  return Object.values(groupedTxs).map((group: any) => (
                    <div key={group.id} className="bg-[var(--surface)] p-4 rounded-xl border-2 border-[var(--border)] shadow-brutal-sm">
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[var(--dust)]">
                        <div>
                          <span className="font-bold text-[var(--text)] block text-lg">{group.entityName}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{group.type}</span>
                        </div>
                        {group.isCompleted && (
                          <div className="bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30 px-2.5 py-1 rounded-full flex items-center shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span className="font-black text-[10px] uppercase tracking-wider">Completed</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {group.transactions.map((tx: any) => {
                          const isReceipt = tx.type === 'RECEIPT';
                          return (
                            <div key={tx.id} className="flex justify-between items-center bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--dust)]">
                              <span className="text-xs text-[var(--muted)] font-medium font-mono">
                                {format(new Date(tx.createdAt), "dd MMM yy")} • {tx.mode}
                              </span>
                              <div className="text-right flex flex-col">
                                <span className={\ont-black text-sm tabular-nums \\}>
                                  {isReceipt ? '+' : '-'}?{Number(tx.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
;

// Regex replacement
const regex = /<div className="space-y-4">\s*\{transactions\.map\(\(tx: any\) => \{[\s\S]*?No recent history\.<\/p>\s*<\/div>\s*\)\}\s*<\/div>/g;
content = content.replace(regex, groupingLogic.trim());

fs.writeFileSync('src/components/AccountingDashboardClient.tsx', content);
