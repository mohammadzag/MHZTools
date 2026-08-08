const packager = require('electron-packager');

async function bundle() {
    console.log('Starting electron-packager API build...');
    try {
        const appPaths = await packager({
            dir: '.',
            name: 'mhz-tools',
            platform: 'win32',
            arch: 'x64',
            out: 'dist',
            overwrite: true,
            prune: true
        });
        console.log('App packaged successfully!');
        console.log('Output directories:', appPaths);
    } catch (err) {
        console.error('Error during packaging process:', err);
        process.exit(1);
    }
}

bundle();
