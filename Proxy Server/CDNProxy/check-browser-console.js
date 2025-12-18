const puppeteer = require('puppeteer');

async function checkConsoleErrors() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    const errors = [];
    
    // Capturar erros do console
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push({
                type: 'console_error',
                message: msg.text(),
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Capturar erros de rede
    page.on('response', response => {
        if (response.status() >= 400) {
            errors.push({
                type: 'network_error',
                url: response.url(),
                status: response.status(),
                statusText: response.statusText(),
                timestamp: new Date().toISOString()
            });
        }
    });
    
    try {
        console.log('🔍 Verificando página principal...');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        console.log('🔍 Verificando página de login...');
        await page.goto('http://localhost:8080/auth/login', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        console.log('🔍 Verificando página de superadmin...');
        await page.goto('http://localhost:8080/superadmin/monitoring', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(5000);
        
    } catch (error) {
        errors.push({
            type: 'navigation_error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
    
    await browser.close();
    
    console.log('\n📊 RELATÓRIO DE ERROS:');
    console.log('='.repeat(50));
    
    if (errors.length === 0) {
        console.log('✅ Nenhum erro encontrado!');
    } else {
        console.log(`❌ Total de erros encontrados: ${errors.length}`);
        console.log('\nDetalhes dos erros:');
        
        errors.forEach((error, index) => {
            console.log(`\n${index + 1}. [${error.type.toUpperCase()}]`);
            if (error.url) {
                console.log(`   URL: ${error.url}`);
                console.log(`   Status: ${error.status} - ${error.statusText}`);
            } else {
                console.log(`   Mensagem: ${error.message}`);
            }
            console.log(`   Timestamp: ${error.timestamp}`);
        });
    }
}

checkConsoleErrors().catch(console.error);
