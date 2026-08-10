const fs = require('fs');
let content = fs.readFileSync('o:/webapp/src/app/actions/masterData.ts', 'utf8');

// Reset everything to plain return;
content = content.replace(/return \{ id: .*\};/g, 'return;');

// Update create actions
content = content.replace(/await ([A-Za-z]+)Repository\.create\(([\s\S]*?)\);\s+revalidatePath\('([^']+)'\);\s+revalidatePath\('([^']+)'\);\s+return;/g, 'const item = await $1Repository.create($2);\n    revalidatePath('');\n    revalidatePath('');\n    return { id: item.id, name: item.name };');

// Update Farmer action specifically
content = content.replace(/const item = await FarmerRepository\.create\(([\s\S]*?)\);\n    revalidatePath\('([^']+)'\);\n    revalidatePath\('([^']+)'\);\n    return \{ id: item\.id, name: item\.name \};/g, 'const item = await FarmerRepository.create($1);\n    revalidatePath('');\n    revalidatePath('');\n    return { id: item.id, name: item.name, brokerId: item.brokerId };');

fs.writeFileSync('o:/webapp/src/app/actions/masterData.ts', content);
