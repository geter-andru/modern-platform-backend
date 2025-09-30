// Simple test for Claude AI service
const { claudeAIService } = require('./app/lib/services/claudeAIService');

async function testClaudeService() {
  console.log('🧪 Testing Claude AI Service Connection...');
  
  try {
    const testProductData = {
      productName: 'Test Product',
      targetMarket: 'Small businesses',
      description: 'A simple test product for validation'
    };
    
    const testResearchData = {
      marketSize: 'Large market opportunity',
      competitiveAnalysis: 'Few direct competitors',
      trends: 'Growing demand'
    };
    
    console.log('📡 Calling Claude AI service...');
    const result = await claudeAIService.generateResourcesFromResearch(testProductData, testResearchData);
    
    console.log('✅ Claude AI service working properly!');
    console.log('📊 Generated session ID:', result.sessionId);
    console.log('🔍 Sample ICP data available:', !!result.data.icpAnalysis);
    console.log('👥 Sample personas available:', !!result.data.buyerPersonas);
    
  } catch (error) {
    console.error('❌ Claude AI service test failed:', error.message);
    console.error('🔧 Full error:', error);
  }
}

testClaudeService();