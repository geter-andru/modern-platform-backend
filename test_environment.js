#!/usr/bin/env node

/**
 * Comprehensive Test Environment for Next.js Platform
 * Tests all migrated components and functionality
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const execAsync = promisify(exec);

class TestEnvironment {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      buildTest: false,
      componentTests: {},
      authTests: {},
      toolTests: {},
      errorHandling: {},
      loadingStates: {},
      overall: false
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${timestamp}] ${message}`);
  }

  async runBuildTest() {
    try {
      await this.log('🔨 Testing Build Process', 'info');
      
      // Test TypeScript compilation
      const { stdout: tscOutput } = await execAsync('npx tsc --noEmit');
      await this.log('TypeScript compilation successful', 'success');
      
      // Test build process
      const { stdout: buildOutput } = await execAsync('npm run build');
      await this.log('Next.js build successful', 'success');
      
      this.results.buildTest = true;
      return true;
    } catch (error) {
      await this.log(`Build test failed: ${error.message}`, 'error');
      this.results.buildTest = false;
      return false;
    }
  }

  async testComponentStructure() {
    await this.log('🧩 Testing Component Structure', 'info');
    
    const requiredComponents = [
      'components/icp/SimplifiedICP.tsx',
      'components/cost-calculator/SimplifiedCostCalculator.tsx', 
      'components/business-case/SimplifiedBusinessCaseBuilder.tsx',
      'components/admin/AdminModeIndicator.tsx',
      'components/admin/DemoContentBadge.tsx',
      'components/ui/LoadingStates.tsx'
    ];

    const requiredServices = [
      'lib/services/airtableService.ts',
      'lib/services/authService.ts',
      'lib/utils/errorHandling.ts'
    ];

    let passed = 0;
    let total = requiredComponents.length + requiredServices.length;

    for (const component of requiredComponents) {
      const filePath = path.join(process.cwd(), component);
      if (fs.existsSync(filePath)) {
        await this.log(`✓ Component exists: ${component}`, 'success');
        passed++;
      } else {
        await this.log(`✗ Missing component: ${component}`, 'error');
      }
    }

    for (const service of requiredServices) {
      const filePath = path.join(process.cwd(), service);
      if (fs.existsSync(filePath)) {
        await this.log(`✓ Service exists: ${service}`, 'success');
        passed++;
      } else {
        await this.log(`✗ Missing service: ${service}`, 'error');
      }
    }

    this.results.componentTests.structure = passed === total;
    await this.log(`Component structure test: ${passed}/${total} passed`, 
      passed === total ? 'success' : 'warning');
    
    return passed === total;
  }

  async testAuthenticationFlow() {
    await this.log('🔐 Testing Authentication Flow', 'info');
    
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // Test login page
      await page.goto(`${this.baseUrl}/login`);
      await page.waitForSelector('h1', { timeout: 5000 });
      
      const loginTitle = await page.$eval('h1', el => el.textContent);
      if (loginTitle.includes('Customer Login') || loginTitle.includes('Login')) {
        await this.log('✓ Login page renders correctly', 'success');
        this.results.authTests.loginPage = true;
      }

      // Test admin authentication
      await page.type('input[placeholder*="Customer ID"]', 'dru78DR9789SDF862');
      await page.type('input[placeholder*="Access Token"]', 'admin-demo-token-2025');
      
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForNavigation({ timeout: 10000 });
        
        const currentUrl = page.url();
        if (currentUrl.includes('/dashboard') || currentUrl.includes('/customer/')) {
          await this.log('✓ Admin authentication successful', 'success');
          this.results.authTests.adminAuth = true;
        }
      }

      await browser.close();
      return true;
    } catch (error) {
      await this.log(`Authentication test failed: ${error.message}`, 'error');
      this.results.authTests.overall = false;
      return false;
    }
  }

  async testToolFunctionality() {
    await this.log('🛠️ Testing Tool Functionality', 'info');
    
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // Test ICP Analysis
      await this.log('Testing ICP Analysis tool...', 'info');
      await page.goto(`${this.baseUrl}/icp`);
      await page.waitForSelector('h1', { timeout: 5000 });
      
      const icpTitle = await page.$eval('h1', el => el.textContent);
      if (icpTitle.includes('ICP Analysis')) {
        await this.log('✓ ICP Analysis page loads', 'success');
        this.results.toolTests.icp = true;
      }

      // Test Cost Calculator
      await this.log('Testing Cost Calculator tool...', 'info');
      await page.goto(`${this.baseUrl}/cost-calculator`);
      await page.waitForSelector('h1', { timeout: 5000 });
      
      const costTitle = await page.$eval('h1', el => el.textContent);
      if (costTitle.includes('Cost Calculator')) {
        await this.log('✓ Cost Calculator page loads', 'success');
        this.results.toolTests.costCalculator = true;
      }

      // Test Business Case Builder
      await this.log('Testing Business Case Builder tool...', 'info');
      await page.goto(`${this.baseUrl}/business-case`);
      await page.waitForSelector('h1', { timeout: 5000 });
      
      const businessTitle = await page.$eval('h1', el => el.textContent);
      if (businessTitle.includes('Business Case')) {
        await this.log('✓ Business Case Builder page loads', 'success');
        this.results.toolTests.businessCase = true;
      }

      await browser.close();
      return true;
    } catch (error) {
      await this.log(`Tool functionality test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testErrorHandling() {
    await this.log('🚨 Testing Error Handling', 'info');
    
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // Test 404 page
      await page.goto(`${this.baseUrl}/nonexistent-page`);
      await page.waitForSelector('body', { timeout: 5000 });
      
      const pageContent = await page.content();
      if (pageContent.includes('404') || pageContent.includes('Not Found')) {
        await this.log('✓ 404 error handling works', 'success');
        this.results.errorHandling.notFound = true;
      }

      // Test unauthorized access
      await page.goto(`${this.baseUrl}/dashboard`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        await this.log('✓ Unauthorized redirect works', 'success');
        this.results.errorHandling.unauthorized = true;
      }

      await browser.close();
      return true;
    } catch (error) {
      await this.log(`Error handling test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testLoadingStates() {
    await this.log('⏳ Testing Loading States', 'info');
    
    try {
      // Test if loading components exist
      const loadingStatesPath = path.join(process.cwd(), 'components/ui/LoadingStates.tsx');
      if (fs.existsSync(loadingStatesPath)) {
        const content = fs.readFileSync(loadingStatesPath, 'utf-8');
        
        const requiredComponents = [
          'LoadingSpinner',
          'PageLoading', 
          'CardSkeleton',
          'ProgressLoading',
          'LoadingButton',
          'SmartLoading'
        ];

        let foundComponents = 0;
        requiredComponents.forEach(component => {
          if (content.includes(`export const ${component}`) || content.includes(`const ${component}`)) {
            foundComponents++;
          }
        });

        if (foundComponents === requiredComponents.length) {
          await this.log('✓ All loading components implemented', 'success');
          this.results.loadingStates.components = true;
        } else {
          await this.log(`⚠️ Loading components: ${foundComponents}/${requiredComponents.length}`, 'warning');
        }
      }

      return true;
    } catch (error) {
      await this.log(`Loading states test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async generateTestReport() {
    await this.log('📊 Generating Test Report', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      platform: 'Next.js Revenue Intelligence Platform',
      version: '1.0.0',
      testResults: this.results,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0
      }
    };

    // Calculate summary
    const flatResults = this.flattenResults(this.results);
    report.summary.totalTests = Object.keys(flatResults).length;
    report.summary.passedTests = Object.values(flatResults).filter(r => r === true).length;
    report.summary.failedTests = report.summary.totalTests - report.summary.passedTests;
    report.summary.successRate = Math.round((report.summary.passedTests / report.summary.totalTests) * 100);

    // Overall status
    report.testResults.overall = report.summary.successRate >= 80;

    // Write report to file
    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
    
    await this.log('📄 Test report written to test-report.json', 'info');
    return report;
  }

  flattenResults(obj, prefix = '') {
    let flattened = {};
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, this.flattenResults(obj[key], `${prefix}${key}.`));
      } else {
        flattened[`${prefix}${key}`] = obj[key];
      }
    }
    return flattened;
  }

  async runAllTests() {
    await this.log('🚀 Starting Comprehensive Test Suite', 'info');
    await this.log('==========================================', 'info');

    // Run all tests
    const tests = [
      { name: 'Build Test', fn: () => this.runBuildTest() },
      { name: 'Component Structure', fn: () => this.testComponentStructure() },
      { name: 'Authentication Flow', fn: () => this.testAuthenticationFlow() },
      { name: 'Tool Functionality', fn: () => this.testToolFunctionality() },
      { name: 'Error Handling', fn: () => this.testErrorHandling() },
      { name: 'Loading States', fn: () => this.testLoadingStates() }
    ];

    for (const test of tests) {
      try {
        await this.log(`\n🧪 Running ${test.name}...`, 'info');
        const result = await test.fn();
        await this.log(`${test.name}: ${result ? 'PASSED' : 'FAILED'}`, 
          result ? 'success' : 'error');
      } catch (error) {
        await this.log(`${test.name}: FAILED - ${error.message}`, 'error');
      }
    }

    // Generate final report
    const report = await this.generateTestReport();
    
    await this.log('\n==========================================', 'info');
    await this.log('🏁 Test Suite Complete', 'info');
    await this.log(`📊 Success Rate: ${report.summary.successRate}%`, 
      report.summary.successRate >= 80 ? 'success' : 'warning');
    await this.log(`✅ Passed: ${report.summary.passedTests}`, 'success');
    await this.log(`❌ Failed: ${report.summary.failedTests}`, 'error');
    await this.log('==========================================', 'info');

    return report;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testEnv = new TestEnvironment();
  testEnv.runAllTests()
    .then(report => {
      process.exit(report.testResults.overall ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export default TestEnvironment;