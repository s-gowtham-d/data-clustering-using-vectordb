import fs from 'fs';
import csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

export function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                const id = row.id || row.ID;
                const name = row.name || row.Name || row.NAME;

                if (id && name) {
                    results.push({ id: id.trim(), name: name.trim() });
                }
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

export async function writeCondensedCSV(filePath, clusters) {
    const writer = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: 'group_id', title: 'group_id' },
            { id: 'group_name', title: 'group_name' },
            { id: 'members_id', title: 'members_id' },
            { id: 'members_name', title: 'members_name' }
        ]
    });

    const records = clusters.map(cluster => ({
        group_id: cluster.id,
        group_name: cluster.name,
        members_id: cluster.members.map(m => m.id).join(','),
        members_name: cluster.members.map(m => m.name).join(', ')
    }));

    await writer.writeRecords(records);
}