const puppeteer = require('puppeteer');

async function checkConsoleErrors() {
  console.log('🔍 Iniciando verificação de erros no console...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  
  // Capturar erros do console
  const consoleErrors = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: 'console',
        message: msg.text(),
        location: msg.location()
      });
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack
    });
  });

  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure().errorText,
      method: request.method()
    });
  });

  try {
    console.log('📋 Acessando https://app.cdnproxy.top...');
    await page.goto('https://app.cdnproxy.top', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Aguardar um pouco para capturar todos os erros
    await page.waitForTimeout(5000);

    console.log('\n📊 RELATÓRIO DE ERROS:');
    console.log('='.repeat(50));
    
    if (consoleErrors.length > 0) {
      console.log(`\n🚨 ${consoleErrors.length} erros de console encontrados:`);
      consoleErrors.forEach((error, index) => {
        console.log(`\n${index + 1}. [${error.type.toUpperCase()}]`);
        console.log(`   Mensagem: ${error.message}`);
        if (error.location) {
          console.log(`   Local: ${error.location.url}:${error.location.lineNumber}:${error.location.columnNumber}`);
        }
        if (error.stack) {
          console.log(`   Stack: ${error.stack.substring(0, 200)}...`);
        }
      });
    } else {
      console.log('\n✅ Nenhum erro de console encontrado!');
    }

    if (networkErrors.length > 0) {
      console.log(`\n🌐 ${networkErrors.length} erros de rede encontrados:`);
      networkErrors.forEach((error, index) => {
        console.log(`\n${index + 1}. [NETWORK ERROR]`);
        console.log(`   URL: ${error.url}`);
        console.log(`   Método: ${error.method}`);
        console.log(`   Erro: ${error.failure}`);
      });
    } else {
      console.log('\n✅ Nenhum erro de rede encontrado!');
    }

    // Tentar fazer login para verificar erros na aplicação autenticada
    console.log('\n📋 Tentando fazer login...');
    
    try {
      // Aguardar o formulário de login aparecer
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      
      // Preencher credenciais
      await page.type('input[type="email"]', 'alaxricardsilva@gmail.com');
      await page.type('input[type="password"]', 'Admin123');
      
      // Clicar no botão de login
      await page.click('button[type="submit"]');
      
      // Aguardar redirecionamento ou erro
      await page.waitForTimeout(5000);
      
      console.log('📋 Login realizado, verificando erros pós-login...');
      
    } catch (loginError) {
      console.log(`⚠️ Erro durante login: ${loginError.message}`);
    }

    console.log('\n📊 RESUMO FINAL:');
    console.log(`Total de erros de console: ${consoleErrors.length}`);
    console.log(`Total de erros de rede: ${networkErrors.length}`);
    console.log(`Total geral: ${consoleErrors.length + networkErrors.length}`);

  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  checkConsoleErrors().catch(console.error);
}

module.exports = { checkConsoleErrors };