import 'dotenv/config';
import { clearCollection } from './lib/vectordb.js';

console.log('🗑️  Clearing ChromaDB collection...\n');

try {
    await clearCollection();
    console.log('\n✅ Collection cleared successfully');
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}