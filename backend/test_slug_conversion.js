/**
 * Test script to verify slug conversion for studios and genres.
 * This fetches actual data from the API and tests all genres and studios.
 * Since we now use studioSlug from API detail page, this test just validates the API data.
 */

const https = require('https');

function fetchGenresAndStudios() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ecchizone-api.vercel.app',
      path: '/api/genres',
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('FETCHING GENRES AND STUDIOS FROM API...');
  console.log('='.repeat(80));

  try {
    const data = await fetchGenresAndStudios();
    const genres = data.genres || [];
    const studios = data.studios || [];

    console.log(`Fetched ${genres.length} genres and ${studios.length} studios`);
    console.log();

    console.log('='.repeat(80));
    console.log('STUDIO DATA VALIDATION');
    console.log('='.repeat(80));

    let studioValid = 0;
    let studioInvalid = 0;
    const studioIssues = [];

    for (const studio of studios) {
      const studioName = studio.name || '';
      const studioSlug = studio.slug || '';
      const expectedUrl = studio.url || '';

      // Extract slug from URL if slug field is empty
      let urlSlug = '';
      if (expectedUrl) {
        urlSlug = expectedUrl.split('/studio/')[1]?.replace(/\/$/, '') || '';
      }

      if (!studioName) {
        studioInvalid++;
        studioIssues.push({ name: '(empty)', issue: 'Missing name' });
        continue;
      }

      if (!studioSlug && !urlSlug) {
        studioInvalid++;
        studioIssues.push({ name: studioName, issue: 'Missing slug in both slug and url fields' });
        console.log(`[INVALID] | '${studioName}' - no slug available`);
      } else {
        studioValid++;
        console.log(`[OK] | '${studioName}' - slug: '${studioSlug || urlSlug}'`);
      }
    }

    console.log(`\nStudio Results: ${studioValid} valid, ${studioInvalid} invalid`);

    if (studioIssues.length > 0) {
      console.log('\n[!] Invalid studios:');
      for (const issue of studioIssues.slice(0, 10)) {
        console.log(`  - ${issue.name}: ${issue.issue}`);
      }
      if (studioIssues.length > 10) {
        console.log(`  ... and ${studioIssues.length - 10} more`);
      }
    }

    console.log();

    console.log('='.repeat(80));
    console.log('GENRE DATA VALIDATION');
    console.log('='.repeat(80));

    let genreValid = 0;
    let genreInvalid = 0;
    const genreIssues = [];

    for (const genre of genres) {
      const genreName = genre.name || '';
      const genreSlug = genre.slug || '';
      const expectedUrl = genre.url || '';

      // Extract slug from URL if slug field is empty
      let urlSlug = '';
      if (expectedUrl) {
        urlSlug = expectedUrl.split('/genre/')[1]?.replace(/\/$/, '') || '';
      }

      if (!genreName) {
        genreInvalid++;
        genreIssues.push({ name: '(empty)', issue: 'Missing name' });
        continue;
      }

      if (!genreSlug && !urlSlug) {
        genreInvalid++;
        genreIssues.push({ name: genreName, issue: 'Missing slug in both slug and url fields' });
        console.log(`[INVALID] | '${genreName}' - no slug available`);
      } else {
        genreValid++;
        console.log(`[OK] | '${genreName}' - slug: '${genreSlug || urlSlug}'`);
      }
    }

    console.log(`\nGenre Results: ${genreValid} valid, ${genreInvalid} invalid`);

    if (genreIssues.length > 0) {
      console.log('\n[!] Invalid genres:');
      for (const issue of genreIssues.slice(0, 10)) {
        console.log(`  - ${issue.name}: ${issue.issue}`);
      }
      if (genreIssues.length > 10) {
        console.log(`  ... and ${genreIssues.length - 10} more`);
      }
    }

    console.log();

    const totalValid = studioValid + genreValid;
    const totalInvalid = studioInvalid + genreInvalid;
    const totalTests = totalValid + totalInvalid;

    console.log('='.repeat(80));
    console.log(`TOTAL RESULTS: ${totalValid}/${totalTests} entries valid`);
    console.log('='.repeat(80));

    if (totalInvalid > 0) {
      console.log('\n[!] Some entries are missing slug data.');
      console.log('    The app should use studioSlug from detail page API for navigation.');
      process.exit(1);
    } else {
      console.log('\n[OK] All entries have valid slug data!');
      console.log('    The app should use studioSlug from detail page API for navigation.');
      process.exit(0);
    }
  } catch (error) {
    console.error('[ERROR] Failed to fetch data from API:', error.message);
    process.exit(1);
  }
}

runTests();
