import { getBestVoiceForCountry, getVoices } from '../tools/voice'

async function verifyVoiceMatching() {
    console.log('--- Verifying Voice Matching ---');

    // 1. List available voices
    const voices = await getVoices();
    if (voices.success) {
        console.log('Installed Voices:', (voices.data as any[]).map(v => `${v.Name} (${v.Culture})`));
    } else {
        console.error('Error getting voices:', voices.error);
    }

    if (!voices.success || (voices.data as any[]).length === 0) {
        console.warn('No voices installed. Verification might be limited.');
    }

    // 2. Test Mappings
    const testCases = [
        { country: 'France', expectedCode: 'fr' },
        { country: 'US', expectedCode: 'en-US' },
        { country: 'India', expectedCode: 'in' }, // might be en-IN
        { country: 'Brazil', expectedCode: 'pt-BR' }
    ];

    for (const test of testCases) {
        const voice = await getBestVoiceForCountry(test.country);
        console.log(`Country: ${test.country} -> Matched Voice: ${voice || 'None'}`);
    }
}

verifyVoiceMatching().catch(console.error);
